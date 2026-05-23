/**
 * scripts/parseCatalog.js
 *
 * Parse a course catalog CSV into normalized JSON.
 *
 * Usage:
 *   npm run catalog:parse -- input.csv output.json
 *
 * Example:
 *   npm run catalog:parse -- data/raw/catalog.csv data/parsed/catalog.parsed.json
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

function normalizeNullable(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === '-') return null;
  return trimmed;
}

function parseNumber(value) {
  const normalized = normalizeNullable(value);
  if (normalized === null) return null;

  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function parseBooleanYesNo(value) {
  return String(value || '').trim().toLowerCase() === 'yes';
}

function parseList(value) {
  const normalized = normalizeNullable(value);
  if (!normalized) return [];

  return normalized
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function buildCourseCode(subjectCode, catalogNumber) {
  if (!subjectCode || !catalogNumber) return null;
  return `${subjectCode} ${catalogNumber}`;
}

function deriveLevelNumber(catalogNumber) {
  const normalized = normalizeNullable(catalogNumber);
  if (!normalized) return null;

  const match = normalized.match(/^(\d{3})[A-Z]*$/i);
  if (!match) return null;

  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;

  return Math.floor(n / 100) * 100;
}

function parseRow(row) {
  const subjectCode = normalizeNullable(row['Subject code']);
  const catalogNumber = normalizeNullable(row['Catalog Number']);
  const title = normalizeNullable(row['Course Title']);
  const description = normalizeNullable(row['Course Description']);

  return {
    courseId: normalizeNullable(row['Course ID']),
    subjectCode,
    catalogNumber,
    courseCode: buildCourseCode(subjectCode, catalogNumber),
    levelNumber: deriveLevelNumber(catalogNumber),
    offeringUnit: normalizeNullable(row['Offering Unit']),
    title,
    description,
    minUnits: parseNumber(row['Min Units']),
    maxUnits: parseNumber(row['Max Units']),
    repeatableForCredit: parseBooleanYesNo(row['Repeatable for Credit']),
    totalCompletionsAllowed: parseNumber(row['Total Completions Allowed']),
    totalUnitsAllowed: parseNumber(row['Total Units Allowed']),
    gradingBasis: normalizeNullable(row['Grading Basis']),
    components: parseList(row['Components']),
    courseAttributes: parseList(row['Course Attributes']),
    enrollmentRequirementsRaw: normalizeNullable(row['Enrollment Requirements']),
    courseRequisitesRaw: normalizeNullable(row['Course Requisites']),
    searchableText: [
      buildCourseCode(subjectCode, catalogNumber),
      title,
      description
    ]
      .filter(Boolean)
      .join(' ')
  };
}

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3] || 'catalog.parsed.json';

  if (!inputPath) {
    console.error('Usage: npm run catalog:parse -- <input.csv> [output.json]');
    process.exit(1);
  }

  const resolvedInput = path.resolve(inputPath);
  const resolvedOutput = path.resolve(outputPath);

  if (!fs.existsSync(resolvedInput)) {
    console.error(`Input file not found: ${resolvedInput}`);
    process.exit(1);
  }

  const csvText = fs.readFileSync(resolvedInput, 'utf8');

  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true
  });

  const courses = rows.map(parseRow);

  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
  fs.writeFileSync(resolvedOutput, JSON.stringify(courses, null, 2), 'utf8');

  console.log(`Parsed ${courses.length} courses`);
  console.log(`Output written to: ${resolvedOutput}`);
}

main();