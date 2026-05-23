import fs from 'fs';
import path from 'path';
import { getDb } from './db';

const { buildSnapshot } = require('../../scripts/advisementParser');

const DB_PATH = path.join(process.cwd(), 'data', 'degreeplan.db');

type Row = Record<string, any>;

type ImportAdvisementOptions = {
  major?: string;
  majorCode?: string;
};

function queryAll(db: any, sql: string, params?: Record<string, any>): Row[] {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const rows: Row[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(db: any, sql: string, params?: Record<string, any>): Row | null {
  return queryAll(db, sql, params)[0] ?? null;
}

function persist(db: any) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function normalizeMajorCode(options: ImportAdvisementOptions) {
  if (options.majorCode) return options.majorCode;
  const major = String(options.major || '').toLowerCase();

  if (major.includes('computer science')) return 'CSC-BS';

  return 'CSC-BS';
}

function getMajorId(db: any, majorCode: string) {
  const row = queryOne(db, `SELECT id FROM majors WHERE code = $code`, { $code: majorCode });
  if (!row) throw new Error(`Major not found in DB: ${majorCode}. Import the degree requirements first.`);
  return Number(row.id);
}

function getRequirementNodeId(db: any, majorId: number, requirementCode: string) {
  const row = queryOne(
    db,
    `SELECT id FROM requirement_nodes WHERE major_id = $majorId AND code = $code`,
    { $majorId: majorId, $code: requirementCode }
  );
  return row ? Number(row.id) : null;
}

function validateSnapshot(snapshot: any) {
  const requirementCount = Array.isArray(snapshot?.requirements) ? snapshot.requirements.length : 0;
  const courseCount = Array.isArray(snapshot?.courseHistory) ? snapshot.courseHistory.length : 0;

  if (!requirementCount && !courseCount) {
    throw new Error('Could not read requirements or course history from this advisement report.');
  }
}

export async function importAdvisementText(text: string, options: ImportAdvisementOptions = {}) {
  if (!text?.trim()) throw new Error('Advisement report text is required.');

  const snapshot = buildSnapshot(text);
  validateSnapshot(snapshot);

  const db = await getDb();
  const majorCode = normalizeMajorCode(options);
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
    const snapshotId = Number(inserted?.id || 0);
    let mappedRequirements = 0;
    let unmappedRequirements = 0;

    for (const req of snapshot.requirements || []) {
      const requirementNodeId = getRequirementNodeId(db, majorId, req.code);
      if (requirementNodeId) mappedRequirements += 1;
      else unmappedRequirements += 1;

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

    return {
      snapshotId,
      student: {
        name: snapshot.student?.name || null,
        studentId: snapshot.student?.studentId || null,
        preparedOn: snapshot.student?.preparedOn || null
      },
      requirementCount: (snapshot.requirements || []).length,
      courseAttemptCount: (snapshot.courseHistory || []).length,
      mappedRequirements,
      unmappedRequirements
    };
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}
