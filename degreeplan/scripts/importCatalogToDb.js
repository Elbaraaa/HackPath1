const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(process.cwd(), 'data', 'degreeplan.db');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function queryOne(db, sql, params = {}) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function applySchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      code        TEXT NOT NULL,
      title       TEXT NOT NULL,
      units       INTEGER NOT NULL DEFAULT 3,
      category    TEXT NOT NULL DEFAULT '',
      major       TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      syllabus    TEXT NOT NULL DEFAULT '',
      prereqs     TEXT NOT NULL DEFAULT '[]',
      offered     TEXT NOT NULL DEFAULT '[]',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_code_major
      ON courses(code, major);
  `);
}

function extractPrereqs(course) {
  const ignoredSubjectCodes = new Set(['MSS']);
  const prereqText = [
    course.enrollmentRequirements,
    course.enrollmentRequirementsRaw,
    course.courseRequisites,
    course.requisites,
    course.courseRequisitesRaw
  ].filter(Boolean).join(' ');

  const matches = prereqText.match(/\b[A-Z]{2,5}\s*\d{3}[A-Z]?\b/g) || [];
  const courseMatches = matches.filter(match => {
    const subject = match.trim().split(/\s+/)[0];
    return !ignoredSubjectCodes.has(subject);
  });

  if (courseMatches.length) {
    return [...new Set(courseMatches.map(x => x.replace(/\s+/, ' ').trim()))];
  }

  const cleaned = prereqText.replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned === '-' || /^\d+$/.test(cleaned)) return [];

  return [cleaned];
}

async function main() {
  const inputPath = process.argv[2];
  const shouldReplace = process.argv.includes('--replace');

  if (!inputPath) {
    console.error('Usage: npm run catalog:import -- data/parsed/catalog.parsed.json [--replace]');
    process.exit(1);
  }

  const resolvedInput = path.resolve(inputPath);

  if (!fs.existsSync(resolvedInput)) {
    console.error(`Catalog JSON not found: ${resolvedInput}`);
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(resolvedInput, 'utf8'));

  if (!Array.isArray(catalog)) {
    console.error('Catalog file must be a JSON array.');
    process.exit(1);
  }

  const SQL = await initSqlJs.default();
  ensureDir(DB_PATH);

  const db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  applySchema(db);

  if (shouldReplace) {
    db.run('DELETE FROM courses');
  }

  db.run('BEGIN TRANSACTION');

  let inserted = 0;
  let updated = 0;

  try {
    for (const course of catalog) {
      const code = course.courseCode || `${course.subjectCode} ${course.catalogNumber}`;
      const title = course.title || course.courseTitle || '';
      const units = Number(course.maxUnits || course.minUnits || course.units || 3);
      const description = course.description || course.courseDescription || '';

      const prereqs = JSON.stringify(
        Array.isArray(course.prereqs) && course.prereqs.length
          ? course.prereqs
          : extractPrereqs(course)
      );

      const offered = JSON.stringify(
        course.offered && course.offered.length ? course.offered : ['Fall', 'Spring']
      );

      const category = course.category || course.subjectCode || 'Catalog';
      const major = course.major || course.offeringUnit || 'University of Arizona Catalog';

      if (!code || code.includes('undefined')) continue;

      const existing = queryOne(
        db,
        `SELECT id FROM courses WHERE code = $code AND major = $major`,
        { $code: code, $major: major }
      );

      if (existing) {
        db.run(
          `
          UPDATE courses
          SET title = $title,
              units = $units,
              category = $category,
              major = $major,
              description = $description,
              prereqs = $prereqs,
              offered = $offered,
              updated_at = datetime('now')
          WHERE id = $id
          `,
          {
            $id: existing.id,
            $title: title,
            $units: units,
            $category: category,
            $major: major,
            $description: description,
            $prereqs: prereqs,
            $offered: offered
          }
        );

        updated++;
      } else {
        db.run(
          `
          INSERT INTO courses
            (code, title, units, category, major, description, syllabus, prereqs, offered)
          VALUES
            ($code, $title, $units, $category, $major, $description, '', $prereqs, $offered)
          `,
          {
            $code: code,
            $title: title,
            $units: units,
            $category: category,
            $major: major,
            $description: description,
            $prereqs: prereqs,
            $offered: offered
          }
        );

        inserted++;
      }
    }

    db.run('COMMIT');

    fs.writeFileSync(DB_PATH, Buffer.from(db.export()));

    console.log('Imported catalog into DB');
    console.log(`Inserted: ${inserted}`);
    console.log(`Updated: ${updated}`);
    console.log(`Total processed: ${catalog.length}`);
    console.log(`DB written to: ${DB_PATH}`);
  } catch (err) {
    db.run('ROLLBACK');
    console.error('Catalog import failed:');
    console.error(err);
    process.exit(1);
  }
}

main();
