/**
 * scripts/parseAdvisementPdf.js
 *
 * Usage:
 *   npm run advisement:parse -- data/raw/Mostafa.pdf data/parsed/mostafa-advisement.json
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { buildSnapshot } = require('./advisementParser');

async function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3] || 'advisement.parsed.json';

  if (!inputPath) {
    console.error('Usage: npm run advisement:parse -- <input.pdf> [output.json]');
    process.exit(1);
  }

  const resolvedInput = path.resolve(inputPath);
  const resolvedOutput = path.resolve(outputPath);

  if (!fs.existsSync(resolvedInput)) {
    console.error(`Input file not found: ${resolvedInput}`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(resolvedInput);
  const pdf = await pdfParse(buffer);
  const text = pdf.text || '';

  if (!text.trim()) {
    console.error('No text could be extracted from the PDF.');
    process.exit(1);
  }

  const snapshot = buildSnapshot(text);

  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
  fs.writeFileSync(resolvedOutput, JSON.stringify(snapshot, null, 2), 'utf8');

  console.log('Parsed advisement PDF');
  console.log(`Requirements: ${snapshot.requirements.length}`);
  console.log(`Course history rows: ${snapshot.courseHistory.length}`);
  console.log(`Output written to: ${resolvedOutput}`);
}

main().catch(err => {
  console.error('Failed to parse advisement PDF:');
  console.error(err);
  process.exit(1);
});