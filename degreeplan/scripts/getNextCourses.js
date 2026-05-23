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

async function main() {
  const snapshotId = Number(process.argv[2] || 1);

  const SQL = await initSqlJs.default();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

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

  if (!remainingResult.length) {
    console.log('No course-based remaining requirements found.');
    return;
  }

  const columns = remainingResult[0].columns;
  const rows = remainingResult[0].values.map(row =>
    Object.fromEntries(columns.map((col, index) => [col, row[index]]))
  );

  const takenCoursesResult = db.exec(`
    SELECT course_code
    FROM student_course_attempts
    WHERE snapshot_id = ${snapshotId}
  `);

  const takenCourses = new Set(
    takenCoursesResult.length
      ? takenCoursesResult[0].values.map(row => row[0])
      : []
  );

  const usedCourses = new Set();

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

  const nextCourses = [];

  for (const row of rows) {
    const options = parseJson(row.available_options_json, []);
    if (!options.length) continue;

    const picks = pickBestOptions(options, row.needed_value);
    if (!picks.length) continue;

    nextCourses.push({
      requirement: row.code,
      title: row.title,
      needed: row.needed_value,
      picks
    });
  }

  console.log('Suggested next courses:');
  console.log(JSON.stringify(nextCourses, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});