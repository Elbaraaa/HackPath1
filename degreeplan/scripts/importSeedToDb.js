/**
 * scripts/importSeedToDb.js
 *
 * Import a major seed JSON file into the SQLite/sql.js database.
 *
 * Usage:
 *   npm run seed:import -- data/seeds/csc-bs.json
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(process.cwd(), 'data', 'degreeplan.db');

function now() {
  return new Date().toISOString();
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function loadDb() {
  const SQL = await initSqlJs.default();
  ensureDir(DB_PATH);

  const db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  applySchema(db);
  return db;
}

function persist(db) {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function applySchema(db) {
  db.run(`
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
  `);
}

function queryOne(db, sql, params = {}) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function clearExistingMajorData(db, majorCode) {
  const major = queryOne(db, `SELECT id FROM majors WHERE code = $code`, { $code: majorCode });
  if (!major) return null;

  const majorId = Number(major.id);

  db.run(`
    DELETE FROM requirement_options
    WHERE requirement_node_id IN (
      SELECT id FROM requirement_nodes WHERE major_id = $majorId
    )
  `, { $majorId: majorId });

  db.run(`
    DELETE FROM requirement_rules
    WHERE requirement_node_id IN (
      SELECT id FROM requirement_nodes WHERE major_id = $majorId
    )
  `, { $majorId: majorId });

  db.run(`DELETE FROM requirement_nodes WHERE major_id = $majorId`, { $majorId: majorId });
  db.run(`DELETE FROM majors WHERE id = $majorId`, { $majorId: majorId });

  return majorId;
}

function insertMajor(db, seed) {
  const metadata = {
    sources: seed.sources || [],
    notes: seed.notes || [],
    policies: seed.policies || {}
  };

  db.run(`
    INSERT INTO majors (code, name, institution, catalog_year, seed_version, metadata_json, created_at, updated_at)
    VALUES ($code, $name, $institution, $catalog_year, $seed_version, $metadata_json, $created_at, $updated_at)
  `, {
    $code: seed.majorCode,
    $name: seed.majorName,
    $institution: seed.institution || null,
    $catalog_year: seed.catalogYear || null,
    $seed_version: seed.seedVersion || 1,
    $metadata_json: JSON.stringify(metadata),
    $created_at: now(),
    $updated_at: now()
  });

  const row = queryOne(db, `SELECT id FROM majors WHERE code = $code`, { $code: seed.majorCode });
  return Number(row.id);
}

function insertNodeRecursive(db, majorId, node, parentId = null, displayOrder = 0) {
  db.run(`
    INSERT INTO requirement_nodes
      (major_id, parent_id, code, title, node_type, display_order, notes_json, metadata_json, created_at, updated_at)
    VALUES
      ($major_id, $parent_id, $code, $title, $node_type, $display_order, $notes_json, $metadata_json, $created_at, $updated_at)
  `, {
    $major_id: majorId,
    $parent_id: parentId,
    $code: node.code,
    $title: node.title,
    $node_type: node.nodeType || 'requirement',
    $display_order: displayOrder,
    $notes_json: JSON.stringify(node.notes || []),
    $metadata_json: JSON.stringify({}),
    $created_at: now(),
    $updated_at: now()
  });

  const row = queryOne(db, `
    SELECT id
    FROM requirement_nodes
    WHERE major_id = $major_id AND code = $code
  `, {
    $major_id: majorId,
    $code: node.code
  });

  const nodeId = Number(row.id);

  if (node.rule) {
    db.run(`
      INSERT INTO requirement_rules
        (requirement_node_id, rule_type, required_count, required_courses, required_units, required_gpa, rule_json, created_at, updated_at)
      VALUES
        ($requirement_node_id, $rule_type, $required_count, $required_courses, $required_units, $required_gpa, $rule_json, $created_at, $updated_at)
    `, {
      $requirement_node_id: nodeId,
      $rule_type: node.rule.type,
      $required_count: node.rule.requiredCount ?? null,
      $required_courses: node.rule.requiredCourses ?? null,
      $required_units: node.rule.requiredUnits ?? null,
      $required_gpa: node.rule.requiredGpa ?? null,
      $rule_json: JSON.stringify(node.rule),
      $created_at: now(),
      $updated_at: now()
    });
  }

  if (Array.isArray(node.options)) {
    node.options.forEach((optionValue, index) => {
      const optionType =
        typeof optionValue === 'string' &&
        optionValue.toLowerCase().includes('transfer')
          ? 'transfer'
          : 'course';

      db.run(`
        INSERT INTO requirement_options
          (requirement_node_id, option_type, option_value, sort_order, metadata_json, created_at, updated_at)
        VALUES
          ($requirement_node_id, $option_type, $option_value, $sort_order, $metadata_json, $created_at, $updated_at)
      `, {
        $requirement_node_id: nodeId,
        $option_type: optionType,
        $option_value: optionValue,
        $sort_order: index,
        $metadata_json: JSON.stringify({}),
        $created_at: now(),
        $updated_at: now()
      });
    });
  }

  if (Array.isArray(node.children)) {
    node.children.forEach((child, index) => {
      insertNodeRecursive(db, majorId, child, nodeId, index);
    });
  }

  return nodeId;
}

async function main() {
  const seedPathArg = process.argv[2];

  if (!seedPathArg) {
    console.error('Usage: npm run seed:import -- data/seeds/csc-bs.json');
    process.exit(1);
  }

  const seedPath = path.resolve(seedPathArg);

  if (!fs.existsSync(seedPath)) {
    console.error(`Seed file not found: ${seedPath}`);
    process.exit(1);
  }

  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  if (!seed.majorCode || !seed.majorName || !Array.isArray(seed.requirements)) {
    console.error('Seed file is missing required fields: majorCode, majorName, requirements');
    process.exit(1);
  }

  const db = await loadDb();

  db.run('BEGIN TRANSACTION');
  try {
    clearExistingMajorData(db, seed.majorCode);
    const majorId = insertMajor(db, seed);

    seed.requirements.forEach((node, index) => {
      insertNodeRecursive(db, majorId, node, null, index);
    });

    db.run('COMMIT');
    persist(db);

    const nodeCount = queryOne(
      db,
      `SELECT COUNT(*) AS count FROM requirement_nodes WHERE major_id = $major_id`,
      { $major_id: majorId }
    );
    const ruleCount = queryOne(
      db,
      `SELECT COUNT(*) AS count
       FROM requirement_rules
       WHERE requirement_node_id IN (
         SELECT id FROM requirement_nodes WHERE major_id = $major_id
       )`,
      { $major_id: majorId }
    );
    const optionCount = queryOne(
      db,
      `SELECT COUNT(*) AS count
       FROM requirement_options
       WHERE requirement_node_id IN (
         SELECT id FROM requirement_nodes WHERE major_id = $major_id
       )`,
      { $major_id: majorId }
    );

    console.log(`Imported seed for ${seed.majorCode}`);
    console.log(`Major ID: ${majorId}`);
    console.log(`Requirement nodes: ${Number(nodeCount.count)}`);
    console.log(`Requirement rules: ${Number(ruleCount.count)}`);
    console.log(`Requirement options: ${Number(optionCount.count)}`);
    console.log(`DB written to: ${DB_PATH}`);
  } catch (err) {
    db.run('ROLLBACK');
    console.error('Seed import failed:');
    console.error(err);
    process.exit(1);
  }
}

main();