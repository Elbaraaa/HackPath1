/**
 * lib/db.ts
 * SQLite via sql.js — pure JavaScript/WASM, no native compilation required.
 * Persists to ./data/degreeplan.db on disk; loads it back on startup.
 */
import initSqlJs, { Database, SqlValue } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'degreeplan.db');

// ── Singleton ─────────────────────────────────────────────────────────────────
let _db: Database | null = null;
let _initPromise: Promise<Database> | null = null;

export async function getDb(): Promise<Database> {
  if (_db) return _db;
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const SQL = await initSqlJs();
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    _db = fs.existsSync(DB_PATH)
      ? new SQL.Database(fs.readFileSync(DB_PATH))
      : new SQL.Database();
    applySchema(_db);
    persist(_db);
    return _db;
  })();
  return _initPromise;
}

/** Write the in-memory DB back to disk after every mutation. */
function persist(db: Database) {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

// ── Schema ────────────────────────────────────────────────────────────────────
function applySchema(db: Database) {
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
    CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_code_major ON courses(code, major);

    CREATE TABLE IF NOT EXISTS plans (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      major           TEXT NOT NULL,
      second_major    TEXT,
      standing        TEXT NOT NULL,
      grad_term       TEXT NOT NULL,
      max_units       INTEGER NOT NULL DEFAULT 16,
      include_summer  INTEGER NOT NULL DEFAULT 0,
      transcript_text TEXT NOT NULL DEFAULT '',
      result_json     TEXT,
      feasibility     TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS majors (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      code          TEXT NOT NULL UNIQUE,
      name          TEXT NOT NULL,
      institution   TEXT,
      catalog_year  TEXT,
      seed_version  INTEGER,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS requirement_nodes (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      major_id       INTEGER NOT NULL,
      parent_id      INTEGER,
      code           TEXT NOT NULL,
      title          TEXT NOT NULL,
      node_type      TEXT NOT NULL,
      display_order  INTEGER NOT NULL DEFAULT 0,
      notes_json     TEXT NOT NULL DEFAULT '[]',
      metadata_json  TEXT NOT NULL DEFAULT '{}',
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (major_id) REFERENCES majors(id),
      FOREIGN KEY (parent_id) REFERENCES requirement_nodes(id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_requirement_nodes_major_code
      ON requirement_nodes(major_id, code);

    CREATE TABLE IF NOT EXISTS requirement_rules (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      requirement_node_id INTEGER NOT NULL UNIQUE,
      rule_type           TEXT NOT NULL,
      required_count      REAL,
      required_courses    REAL,
      required_units      REAL,
      required_gpa        REAL,
      rule_json           TEXT NOT NULL DEFAULT '{}',
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (requirement_node_id) REFERENCES requirement_nodes(id)
    );

    CREATE TABLE IF NOT EXISTS requirement_options (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      requirement_node_id INTEGER NOT NULL,
      option_type         TEXT NOT NULL DEFAULT 'course',
      option_value        TEXT NOT NULL,
      sort_order          INTEGER NOT NULL DEFAULT 0,
      metadata_json       TEXT NOT NULL DEFAULT '{}',
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (requirement_node_id) REFERENCES requirement_nodes(id)
    );
    CREATE INDEX IF NOT EXISTS idx_requirement_options_node
      ON requirement_options(requirement_node_id);

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

// ── Query helpers ─────────────────────────────────────────────────────────────
type Params = { [key: string]: SqlValue } | SqlValue[];

function queryAll(db: Database, sql: string, params?: Params): any[] {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params as any);
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(db: Database, sql: string, params?: Params): any | null {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params as any);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Course {
  id?: number;
  code: string;
  title: string;
  units: number;
  category: string;
  major: string;
  description: string;
  syllabus: string;
  prereqs: string[];
  offered: string[];
}

function asStringArray(value: any): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()];
  } catch {
    return [value.trim()];
  }

  return [];
}

function hydrate(row: any): Course {
  return {
    ...row,
    id: Number(row.id),
    units: Number(row.units),
    prereqs: asStringArray(row.prereqs),
    offered: asStringArray(row.offered),
  };
}

function courseParams(c: Course | Partial<Course>) {
  return {
    $code:        c.code        ?? '',
    $title:       c.title       ?? '',
    $units:       c.units       ?? 3,
    $category:    c.category    ?? '',
    $major:       c.major       ?? '',
    $description: c.description ?? '',
    $syllabus:    c.syllabus    ?? '',
    $prereqs:     JSON.stringify(c.prereqs ?? []),
    $offered:     JSON.stringify(c.offered ?? []),
  };
}

// ── Course helpers ─────────────────────────────────────────────────────────────
export async function getAllCourses(): Promise<Course[]> {
  const db = await getDb();
  return queryAll(db, 'SELECT * FROM courses ORDER BY major, code').map(hydrate);
}

export async function getCoursesPage(options: {
  limit?: number;
  offset?: number;
  q?: string;
  major?: string;
  category?: string;
}): Promise<{ courses: Course[]; total: number; limit: number; offset: number }> {
  const db = await getDb();
  const limit = Math.max(1, Math.min(1000, Number(options.limit || 200)));
  const offset = Math.max(0, Number(options.offset || 0));
  const where: string[] = [];
  const params: Record<string, SqlValue> = { $limit: limit, $offset: offset };

  if (options.q?.trim()) {
    where.push(`(code LIKE $q OR title LIKE $q OR description LIKE $q)`);
    params.$q = `%${options.q.trim()}%`;
  }

  if (options.major?.trim() && options.major !== 'All') {
    where.push(`major = $major`);
    params.$major = options.major.trim();
  }

  if (options.category?.trim() && options.category !== 'All') {
    where.push(`category = $category`);
    params.$category = options.category.trim();
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const totalRow = queryOne(db, `SELECT COUNT(*) AS total FROM courses ${whereSql}`, params);
  const courses = queryAll(
    db,
    `SELECT * FROM courses ${whereSql} ORDER BY major, code LIMIT $limit OFFSET $offset`,
    params
  ).map(hydrate);

  return {
    courses,
    total: Number(totalRow?.total || 0),
    limit,
    offset
  };
}

export async function upsertCourse(c: Course): Promise<Course> {
  const db = await getDb();
  db.run(`
    INSERT INTO courses (code,title,units,category,major,description,syllabus,prereqs,offered)
    VALUES ($code,$title,$units,$category,$major,$description,$syllabus,$prereqs,$offered)
    ON CONFLICT(code,major) DO UPDATE SET
      title=excluded.title, units=excluded.units, category=excluded.category,
      description=excluded.description, syllabus=excluded.syllabus,
      prereqs=excluded.prereqs, offered=excluded.offered,
      updated_at=datetime('now')
  `, courseParams(c));
  persist(db);
  return hydrate(queryOne(db, 'SELECT * FROM courses WHERE code=$code AND major=$major', { $code: c.code, $major: c.major })!);
}

export async function updateCourse(id: number, c: Partial<Course>): Promise<Course> {
  const db = await getDb();
  const existing = queryOne(db, 'SELECT * FROM courses WHERE id=$id', { $id: id });
  if (!existing) throw new Error(`Course ${id} not found`);
  db.run(`
    UPDATE courses
    SET code=$code, title=$title, units=$units, category=$category,
        major=$major, description=$description, syllabus=$syllabus,
        prereqs=$prereqs, offered=$offered, updated_at=datetime('now')
    WHERE id=$id
  `, {
    ...courseParams({ ...hydrate(existing), ...c }),
    $id: id,
  });
  persist(db);
  return hydrate(queryOne(db, 'SELECT * FROM courses WHERE id=$id', { $id: id })!);
}

export async function deleteCourse(id: number): Promise<void> {
  const db = await getDb();
  db.run('DELETE FROM courses WHERE id=$id', { $id: id });
  persist(db);
}

export async function bulkInsertCourses(courses: Course[]): Promise<number> {
  const db = await getDb();
  let inserted = 0;
  db.run('BEGIN TRANSACTION');
  try {
    for (const c of courses) {
      db.run(`
        INSERT OR IGNORE INTO courses
          (code,title,units,category,major,description,syllabus,prereqs,offered)
        VALUES ($code,$title,$units,$category,$major,$description,$syllabus,$prereqs,$offered)
      `, courseParams(c));
      inserted += db.getRowsModified();
    }
    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
  persist(db);
  return inserted;
}

export async function savePlan(p: {
  major: string; second_major?: string; standing: string; grad_term: string;
  max_units: number; include_summer: boolean; transcript_text: string;
  result_json: any; feasibility: string;
}): Promise<number> {
  const db = await getDb();
  db.run(`
    INSERT INTO plans
      (major,second_major,standing,grad_term,max_units,include_summer,transcript_text,result_json,feasibility)
    VALUES ($major,$second_major,$standing,$grad_term,$max_units,$include_summer,$transcript_text,$result_json,$feasibility)
  `, {
    $major:           p.major,
    $second_major:    p.second_major ?? null,
    $standing:        p.standing,
    $grad_term:       p.grad_term,
    $max_units:       p.max_units,
    $include_summer:  p.include_summer ? 1 : 0,
    $transcript_text: p.transcript_text,
    $result_json:     typeof p.result_json === 'string' ? p.result_json : JSON.stringify(p.result_json),
    $feasibility:     p.feasibility,
  });
  persist(db);
  const row = queryOne(db, 'SELECT last_insert_rowid() AS id');
  return Number(row?.id ?? 0);
}
