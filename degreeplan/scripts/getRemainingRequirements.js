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

  const result = db.exec(
    `
    SELECT
      r.code,
      r.title,
      r.node_type,
      rr.rule_type,
      s.status,
      s.metric_type,
      s.required_value,
      s.completed_value,
      s.needed_value,
      s.available_options_json,
      s.applied_courses_json
    FROM student_requirement_status s
    JOIN requirement_nodes r
      ON s.requirement_node_id = r.id
    LEFT JOIN requirement_rules rr
      ON rr.requirement_node_id = r.id
    WHERE s.snapshot_id = $snapshotId
      AND s.status = 'not_satisfied'
      AND r.node_type = 'requirement'
    ORDER BY r.code;
    `,
    { $snapshotId: snapshotId }
  );

  if (!result.length) {
    console.log('No remaining requirements found.');
    return;
  }

  const rows = result[0].values.map(row => {
    const columns = result[0].columns;
    return Object.fromEntries(columns.map((col, i) => [col, row[i]]));
  });

  const remaining = rows.map(row => ({
    code: row.code,
    title: row.title,
    ruleType: row.rule_type,
    metricType: row.metric_type,
    required: row.required_value,
    completed: row.completed_value,
    needed: row.needed_value,
    availableOptions: parseJson(row.available_options_json, []),
    appliedCourses: parseJson(row.applied_courses_json, [])
  }));

  console.log(JSON.stringify(remaining, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});