const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(process.cwd(), 'data', 'degreeplan.db');

async function main() {
  const SQL = await initSqlJs.default();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  const result = db.exec(`
    SELECT 
      r.code,
      r.title,
      s.status,
      s.required_value,
      s.completed_value,
      s.needed_value
    FROM requirement_nodes r
    JOIN student_requirement_status s
      ON r.id = s.requirement_node_id
    WHERE s.snapshot_id = 1
    ORDER BY r.code;
  `);

  if (!result.length) {
    console.log("No results.");
    return;
  }

  const { columns, values } = result[0];

  console.log(columns.join(" | "));
  console.log("-".repeat(80));

  for (const row of values) {
    console.log(row.join(" | "));
  }
}

main();