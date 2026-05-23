const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(process.cwd(), 'data', 'degreeplan.db');

function parseJson(value, fallback = []) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function queryOne(db, sql, params = {}) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function getCourseUnits(db, courseCode) {
  const row = queryOne(
    db,
    `SELECT units FROM courses WHERE code = $courseCode LIMIT 1`,
    { $courseCode: courseCode }
  );

  return row ? Number(row.units) : 3;
}

function cleanOptions(options) {
  return options
    .filter(opt => typeof opt === 'string')
    .map(opt => opt.trim())
    .filter(opt =>
      opt &&
      opt !== 'Approved Transfer Course' &&
      opt !== 'Approved Transfer Coursework'
    );
}

function getRecommendations(db, snapshotId) {
  const remainingResult = db.exec(`
    SELECT
      r.code,
      r.title,
      s.needed_value,
      s.available_options_json
    FROM student_requirement_status s
    JOIN requirement_nodes r
      ON s.requirement_node_id = r.id
    WHERE s.snapshot_id = ${snapshotId}
      AND s.status = 'not_satisfied'
      AND s.metric_type = 'courses'
    ORDER BY r.code;
  `);

  if (!remainingResult.length) return [];

  const columns = remainingResult[0].columns;
  const rows = remainingResult[0].values.map(row =>
    Object.fromEntries(columns.map((col, index) => [col, row[index]]))
  );

  const takenResult = db.exec(`
    SELECT course_code
    FROM student_course_attempts
    WHERE snapshot_id = ${snapshotId}
  `);

  const takenCourses = new Set(
    takenResult.length ? takenResult[0].values.map(row => row[0]) : []
  );

  const usedCourses = new Set();

  function pickBestOptions(options, neededValue) {
    const needed = Math.max(1, Number(neededValue || 1));
    const cleaned = cleanOptions(options);

    const picks = [];
    const cscOptions = cleaned.filter(opt => opt.startsWith('CSC '));
    const otherOptions = cleaned.filter(opt => !opt.startsWith('CSC '));

    for (const opt of [...cscOptions, ...otherOptions]) {
      if (picks.length >= needed) break;
      if (takenCourses.has(opt)) continue;
      if (usedCourses.has(opt)) continue;

      picks.push(opt);
      usedCourses.add(opt);
    }

    return picks;
  }

  const recommendations = [];

  for (const row of rows) {
    const options = parseJson(row.available_options_json, []);
    if (!options.length) continue;

    const picks = pickBestOptions(options, row.needed_value);
    if (!picks.length) continue;

    recommendations.push({
      requirement: row.code,
      title: row.title,
      needed: row.needed_value,
      picks
    });
  }

  return recommendations;
}

function buildPlan(db, recommendations, maxUnits = 15) {
  const semesters = [];
  let current = {
    term: 'Next Semester',
    courses: [],
    totalUnits: 0
  };

  for (const rec of recommendations) {
    for (const courseCode of rec.picks) {
      const units = getCourseUnits(db, courseCode);

      if (current.totalUnits + units > maxUnits) {
        semesters.push(current);
        current = {
          term: `Semester ${semesters.length + 1}`,
          courses: [],
          totalUnits: 0
        };
      }

      current.courses.push({
        courseCode,
        requirement: rec.requirement,
        requirementTitle: rec.title,
        units
      });

      current.totalUnits += units;
    }
  }

  if (current.courses.length > 0) {
    semesters.push(current);
  }

  return semesters;
}

async function main() {
  const snapshotId = Number(process.argv[2] || 1);
  const maxUnits = Number(process.argv[3] || 15);

  const SQL = await initSqlJs.default();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  const recommendations = getRecommendations(db, snapshotId);

  if (!recommendations.length) {
    console.log('No recommendations found.');
    return;
  }

  const plan = buildPlan(db, recommendations, maxUnits);

  console.log(JSON.stringify(plan, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});