const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const subjectCode = process.argv[2] || 'CSC';
const startPage = Number(process.argv[3] || 0);
const maxPages = Number(process.argv[4] || 10);

const OUT_PATH = path.join(
  process.cwd(),
  'data',
  'parsed',
  `${subjectCode.toLowerCase()}-catalog-details.json`
);

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

async function collectDetailUrls(page) {
  const links = await page.$$eval('a[href*="/courses/"]', anchors =>
    anchors
      .map(a => a.href)
      .filter(Boolean)
  );

  return [...new Set(links)];
}

async function scrapeCourseDetail(page, url) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

  const text = clean(await page.locator('body').innerText());

  const title = await page.locator('h1').first().innerText().catch(() => '');
  const courseCodeMatch = text.match(/\b[A-Z]{2,5}\s+\d{3}[A-Z]?\b/);

  function extractAfter(label) {
    const re = new RegExp(`${label}\\s*:?\\s*([\\s\\S]{0,800})`, 'i');
    const m = text.match(re);
    return m ? clean(m[1]) : '';
  }

  const requisites =
    extractAfter('Course Requisites') ||
    extractAfter('Requisites') ||
    extractAfter('Enrollment Requirements');

  return {
    url,
    courseCode: courseCodeMatch ? courseCodeMatch[0] : '',
    title: clean(title),
    pageText: text,
    requisites
  };
}

async function main() {
  ensureDir(OUT_PATH);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const allDetailUrls = new Set();

  for (let p = startPage; p < startPage + maxPages; p++) {
    const url = `https://catalog.arizona.edu/courses?subjectCode=${subjectCode}&page=${p}&cq=`;

    console.log(`Opening list page: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    
    const urls = await collectDetailUrls(page);
    console.log(`Found ${urls.length} detail urls on page ${p}`);

    urls.forEach(u => allDetailUrls.add(u));

    if (urls.length === 0) break;
  }

  const detailUrls = [...allDetailUrls];
  console.log(`Total detail URLs collected: ${detailUrls.length}`);

  const results = [];

  for (let i = 0; i < detailUrls.length; i++) {
    const url = detailUrls[i];

    try {
      console.log(`Scraping ${i + 1}/${detailUrls.length}: ${url}`);
      const course = await scrapeCourseDetail(page, url);
      results.push(course);
    } catch (err) {
      console.error(`Failed: ${url}`);
      console.error(err.message);
    }
  }

  await browser.close();

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2), 'utf8');

  console.log(`Saved ${results.length} courses to ${OUT_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});