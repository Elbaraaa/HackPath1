/**
 * lib/db.ts
 * SQLite database using better-sqlite3.
 * Auto-creates ./data/degreeplan.db on first run.
 * Schema is idempotent (CREATE IF NOT EXISTS).
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'degreeplan.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  applySchema(_db);
  return _db;
}

function applySchema(db: Database.Database) {
  db.exec(`
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
  `);
}

// ── Types ────────────────────────────────────────────────────────────────────
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

// ── Course helpers ────────────────────────────────────────────────────────────
function hydrate(row: any): Course {
  return {
    ...row,
    prereqs: JSON.parse(row.prereqs || '[]'),
    offered:  JSON.parse(row.offered  || '[]'),
  };
}

export function getAllCourses(): Course[] {
  return (getDb().prepare('SELECT * FROM courses ORDER BY major, code').all() as any[]).map(hydrate);
}

export function upsertCourse(c: Course): Course {
  const row = getDb().prepare(`
    INSERT INTO courses (code,title,units,category,major,description,syllabus,prereqs,offered)
    VALUES (@code,@title,@units,@category,@major,@description,@syllabus,@prereqs,@offered)
    ON CONFLICT(code,major) DO UPDATE SET
      title=excluded.title, units=excluded.units, category=excluded.category,
      description=excluded.description, syllabus=excluded.syllabus,
      prereqs=excluded.prereqs, offered=excluded.offered,
      updated_at=datetime('now')
    RETURNING *
  `).get({ ...c, prereqs: JSON.stringify(c.prereqs||[]), offered: JSON.stringify(c.offered||[]) }) as any;
  return hydrate(row);
}

export function updateCourse(id: number, c: Partial<Course>): Course {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM courses WHERE id=?').get(id) as any;
  if (!existing) throw new Error(`Course ${id} not found`);
  const merged = {
    ...existing,
    ...c,
    prereqs: JSON.stringify(c.prereqs ?? JSON.parse(existing.prereqs)),
    offered:  JSON.stringify(c.offered  ?? JSON.parse(existing.offered)),
    updated_at: new Date().toISOString(),
  };
  db.prepare(`UPDATE courses SET code=@code,title=@title,units=@units,category=@category,
    major=@major,description=@description,syllabus=@syllabus,prereqs=@prereqs,offered=@offered,
    updated_at=@updated_at WHERE id=@id`).run({ ...merged, id });
  return hydrate(db.prepare('SELECT * FROM courses WHERE id=?').get(id));
}

export function deleteCourse(id: number) {
  getDb().prepare('DELETE FROM courses WHERE id=?').run(id);
}

export function bulkInsertCourses(courses: Course[]): number {
  const db = getDb();
  const ins = db.prepare(`
    INSERT OR IGNORE INTO courses (code,title,units,category,major,description,syllabus,prereqs,offered)
    VALUES (@code,@title,@units,@category,@major,@description,@syllabus,@prereqs,@offered)
  `);
  return db.transaction((items: Course[]) => {
    let n = 0;
    for (const c of items) n += ins.run({ ...c, prereqs: JSON.stringify(c.prereqs||[]), offered: JSON.stringify(c.offered||[]), syllabus: c.syllabus||'' }).changes;
    return n;
  })(courses);
}

export function savePlan(p: {
  major: string; second_major?: string; standing: string; grad_term: string;
  max_units: number; include_summer: boolean; transcript_text: string;
  result_json: string; feasibility: string;
}): number {
  return getDb().prepare(`
    INSERT INTO plans (major,second_major,standing,grad_term,max_units,include_summer,transcript_text,result_json,feasibility)
    VALUES (@major,@second_major,@standing,@grad_term,@max_units,@include_summer,@transcript_text,@result_json,@feasibility)
  `).run({ ...p, include_summer: p.include_summer ? 1 : 0 }).lastInsertRowid as number;
}
