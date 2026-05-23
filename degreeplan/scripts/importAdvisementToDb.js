const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(process.cwd(), 'data', 'degreeplan.db');

async function loadDb() {
  const SQL = await initSqlJs.default();
  const db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  applySchema(db);
  return db;
}

function persist(db) {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
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
    CREATE TABLE IF NOT EXISTS advisement_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      major_id INTEGER NOT NULL,
      student_name TEXT,
      student_id TEXT,
      prepared_on TEXT,
      academic_summary_json TEXT NOT NULL DEFAULT '{}',
      unit_summary_json TEXT NOT NULL DEFAULT '{}',
      raw_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (major_id) REFERENCES majors(id)
    );

    CREATE TABLE IF NOT EXISTS student_requirement_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      requirement_node_id INTEGER,
      requirement_code TEXT NOT NULL,
      title TEXT,
      status TEXT,
      metric_type TEXT,
      required_value REAL,
      completed_value REAL,
      needed_value REAL,
      applied_courses_json TEXT NOT NULL DEFAULT '[]',
      available_options_json TEXT NOT NULL DEFAULT '[]',
      notes_json TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (snapshot_id) REFERENCES advisement_snapshots(id),
      FOREIGN KEY (requirement_node_id) REFERENCES requirement_nodes(id)
    );

    CREATE TABLE IF NOT EXISTS student_course_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      course_code TEXT NOT NULL,
      term TEXT,
      title TEXT,
      grade TEXT,
      units REAL,
      rpt_code TEXT,
      requirement_designation TEXT,
      credit_type TEXT,
      attempt_status TEXT,
      raw_json TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (snapshot_id) REFERENCES advisement_snapshots(id)
    );
  `);
}

function getMajorId(db, majorCode) {
  const row = queryOne(db, `SELECT id FROM majors WHERE code = $code`, {
    $code: majorCode
  });

  if (!row) {
    throw new Error(`Major not found in DB: ${majorCode}. Run seed import first.`);
  }

  return Number(row.id);
}

function getRequirementNodeId(db, majorId, requirementCode) {
  const row = queryOne(
    db,
    `SELECT id FROM requirement_nodes WHERE major_id = $majorId AND code = $code`,
    {
      $majorId: majorId,
      $code: requirementCode
    }
  );

  return row ? Number(row.id) : null;
}

async function main() {
  const inputPath = process.argv[2];
  const majorCode = process.argv[3] || 'CSC-BS';

  if (!inputPath) {
    console.error('Usage: npm run advisement:import -- data/parsed/mostafa-advisement.json CSC-BS');
    process.exit(1);
  }

  const resolvedInput = path.resolve(inputPath);

  if (!fs.existsSync(resolvedInput)) {
    console.error(`Parsed advisement JSON not found: ${resolvedInput}`);
    process.exit(1);
  }

  const snapshot = JSON.parse(fs.readFileSync(resolvedInput, 'utf8'));
  const db = await loadDb();
  const majorId = getMajorId(db, majorCode);

  db.run('BEGIN TRANSACTION');

  try {
    db.run(
      `
      INSERT INTO advisement_snapshots
        (major_id, student_name, student_id, prepared_on, academic_summary_json, unit_summary_json, raw_json)
      VALUES
        ($majorId, $studentName, $studentId, $preparedOn, $academicSummary, $unitSummary, $rawJson)
      `,
      {
        $majorId: majorId,
        $studentName: snapshot.student?.name || null,
        $studentId: snapshot.student?.studentId || null,
        $preparedOn: snapshot.student?.preparedOn || null,
        $academicSummary: JSON.stringify(snapshot.academicSummary || {}),
        $unitSummary: JSON.stringify(snapshot.unitSummary || {}),
        $rawJson: JSON.stringify(snapshot)
      }
    );

    const inserted = queryOne(db, `SELECT last_insert_rowid() AS id`);
    const snapshotId = Number(inserted.id);

    let mappedRequirements = 0;
    let unmappedRequirements = 0;

    for (const req of snapshot.requirements || []) {
        const requirementNodeId = getRequirementNodeId(db, majorId, req.code);

        if (!requirementNodeId) {
          unmappedRequirements++;
          continue;
        }
        
        mappedRequirements++;

      db.run(
        `
        INSERT INTO student_requirement_status
          (
            snapshot_id,
            requirement_node_id,
            requirement_code,
            title,
            status,
            metric_type,
            required_value,
            completed_value,
            needed_value,
            applied_courses_json,
            available_options_json,
            notes_json
          )
        VALUES
          (
            $snapshotId,
            $requirementNodeId,
            $requirementCode,
            $title,
            $status,
            $metricType,
            $requiredValue,
            $completedValue,
            $neededValue,
            $appliedCourses,
            $availableOptions,
            $notes
          )
        `,
        {
          $snapshotId: snapshotId,
          $requirementNodeId: requirementNodeId,
          $requirementCode: req.code,
          $title: req.title || null,
          $status: req.status || null,
          $metricType: req.metricType || null,
          $requiredValue: req.required ?? null,
          $completedValue: req.completed ?? null,
          $neededValue: req.needed ?? null,
          $appliedCourses: JSON.stringify(req.appliedCourses || []),
          $availableOptions: JSON.stringify(req.availableOptions || []),
          $notes: JSON.stringify(req.notes || [])
        }
      );
    }

    for (const course of snapshot.courseHistory || []) {
      db.run(
        `
        INSERT INTO student_course_attempts
          (
            snapshot_id,
            course_code,
            term,
            title,
            grade,
            units,
            rpt_code,
            requirement_designation,
            credit_type,
            attempt_status,
            raw_json
          )
        VALUES
          (
            $snapshotId,
            $courseCode,
            $term,
            $title,
            $grade,
            $units,
            $rptCode,
            $requirementDesignation,
            $creditType,
            $attemptStatus,
            $rawJson
          )
        `,
        {
          $snapshotId: snapshotId,
          $courseCode: course.courseCode,
          $term: course.term || null,
          $title: course.title || null,
          $grade: course.grade || null,
          $units: course.units ?? null,
          $rptCode: course.rptCode || null,
          $requirementDesignation: course.requirementDesignation || null,
          $creditType: course.creditType || null,
          $attemptStatus: course.attemptStatus || null,
          $rawJson: JSON.stringify(course)
        }
      );
    }

    db.run('COMMIT');
    persist(db);

    console.log(`Imported advisement snapshot`);
    console.log(`Snapshot ID: ${snapshotId}`);
    console.log(`Student: ${snapshot.student?.name || 'Unknown'}`);
    console.log(`Requirements imported: ${(snapshot.requirements || []).length}`);
    console.log(`Mapped requirements: ${mappedRequirements}`);
    console.log(`Unmapped requirements: ${unmappedRequirements}`);
    console.log(`Course attempts imported: ${(snapshot.courseHistory || []).length}`);
    console.log(`DB written to: ${DB_PATH}`);
  } catch (err) {
    db.run('ROLLBACK');
    console.error('Advisement import failed:');
    console.error(err);
    process.exit(1);
  }
}

main();