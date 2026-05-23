const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(process.cwd(), 'data', 'degreeplan.db');

async function main() {
  const SQL = await initSqlJs.default();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  const result = db.exec(`
    SELECT code, title, units
    FROM courses
    WHERE code IN ('CSC 317', 'CSC 343', 'CSC 352', 'CSC 380', 'CSC 437', 'CSC 452', 'CSC 422', 'GEOS 255');
  `);

  if (!result.length) {
    console.log('No matching courses found in DB.');
    return;
  }

  console.log(result[0].columns.join(' | '));
  console.log('-'.repeat(50));

  for (const row of result[0].values) {
    console.log(row.join(' | '));
  }
}

main();