import { chromium } from "playwright";
import fs from "fs";

const BASE_URL = "https://catalog.arizona.edu/courses";
const MAX_CONCURRENT_PAGES = 5;

const args = process.argv.slice(2);

function getArg(flag: string) {
  const index = args.indexOf(flag);
  return index !== -1 ? args[index + 1] : null;
}

const valueFlags = new Set(["--url", "--max-courses", "--out", "--course-code"]);
const positionalArgs = args.filter((arg, index) => {
  if (arg.startsWith("--")) return false;
  return !valueFlags.has(args[index - 1]);
});
const positionalUrl = positionalArgs.find(arg => /^https?:\/\//i.test(arg));
const positionalCsv = positionalArgs.find(arg => /\.csv$/i.test(arg));

const customUrl = getArg("--url") || positionalUrl;
const courseCodeArg = getArg("--course-code");
const maxCoursesArg = getArg("--max-courses");
const outCsv = getArg("--out") || positionalCsv || "data/raw/catalog.csv";
const shouldScrapeDetails = args.includes("--details") || Boolean(customUrl && isCourseDetailUrl(customUrl));
const shouldDownloadCSV = !args.includes("--skip-csv") && !(customUrl && isCourseDetailUrl(customUrl));
const MAX_COURSES = maxCoursesArg ? Number(maxCoursesArg) : Infinity;

const HEADERS = [
  "Course ID",
  "Subject code",
  "Catalog Number",
  "Offering Unit",
  "Course Title",
  "Course Description",
  "Min Units",
  "Max Units",
  "Repeatable for Credit",
  "Total Completions Allowed",
  "Total Units Allowed",
  "Grading Basis",
  "Components",
  "Course Attributes",
  "Enrollment Requirements",
  "Course Requisites",
];

function csvEscape(value: unknown) {
  const text = String(value ?? "-").replace(/\s+/g, " ").trim();
  return `"${text.replace(/"/g, '""')}"`;
}

function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const headers = rows[0];

  return rows.slice(1).map(values => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || "-";
    });
    return obj;
  });
}

function getFieldFromText(text: string, label: string) {
  const lines = text.split("\n").map(x => x.trim()).filter(Boolean);
  const idx = lines.findIndex(line => line.toLowerCase() === label.toLowerCase());
  return idx >= 0 && lines[idx + 1] ? lines[idx + 1] : "-";
}

function getFieldAfterLabel(text: string, label: string) {
  const lines = text.split("\n").map(x => x.trim()).filter(Boolean);
  const idx = lines.findIndex(line => line.toLowerCase() === label.toLowerCase());
  return idx >= 0 && lines[idx + 1] ? lines[idx + 1] : "-";
}

function getAllFieldsAfterLabel(text: string, label: string) {
  const lines = text.split("\n").map(x => x.trim()).filter(Boolean);
  const values: string[] = [];

  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].toLowerCase() !== label.toLowerCase()) continue;
    const value = lines[i + 1]?.trim();
    if (value && value !== "-") values.push(value);
  }

  return values.length ? [...new Set(values)].join("; ") : "-";
}

function choose(detailValue: string, baseValue: string) {
  if (detailValue && detailValue !== "-") return detailValue;
  if (baseValue && baseValue !== "-") return baseValue;
  return "-";
}

function normalizedCourseCode(subjectCode: string, catalogNumber: string) {
  if (!subjectCode || !catalogNumber || subjectCode === "-" || catalogNumber === "-") return "";
  return `${subjectCode.trim().toUpperCase()} ${catalogNumber.trim().toUpperCase()}`;
}

function compactCourseCode(value: string) {
  return (value || "").replace(/\s+/g, "").toUpperCase();
}

function isCourseDetailUrl(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");
    return /^\/courses\/[^/]+$/.test(path);
  } catch {
    return false;
  }
}

function cleanOfferingUnit(value: string) {
  return value
    .replace(/\b(?:Undergraduate|Graduate)\s+UA\s*-\s*UA General/i, "")
    .replace(/\s+/g, " ")
    .trim() || "-";
}

function cleanValue(field: string, value: string) {
  const v = (value || "-").replace(/\s+/g, " ").trim();

  if (!v || v === "-") return "-";

  const emptyMarkers = [
    "May be convened with",
    "Cross Listed Courses",
  ];

  if (
    (field === "Course Requisites" || field === "Enrollment Requirements") &&
    emptyMarkers.includes(v)
  ) {
    return "-";
  }

  return v;
}

function parseCourseIdentityFromText(text: string) {
  const lines = text.split("\n").map(x => x.trim()).filter(Boolean);

  for (const line of lines) {
    const match = line.match(/\b([A-Z]{2,5})\s*(\d{3}[A-Z]?)\b\s*[-–—:]?\s*(.*)/);

    if (match) {
      const subjectCode = match[1];
      const catalogNumber = match[2];
      let courseTitle = match[3]?.trim() || "-";

      if (
        !courseTitle ||
        courseTitle === "-" ||
        courseTitle.toLowerCase().includes("course id") ||
        courseTitle.toLowerCase().includes("subject code")
      ) {
        courseTitle = "-";
      }

      return { subjectCode, catalogNumber, courseTitle };
    }
  }

  return {
    subjectCode: "-",
    catalogNumber: "-",
    courseTitle: "-",
  };
}

function parseOfferingUnitFromText(text: string) {
  const direct = getFieldFromText(text, "Offering Unit");
  if (direct !== "-") return cleanOfferingUnit(direct);

  const lines = text.split("\n").map(x => x.trim()).filter(Boolean);

  const possibleUnit = lines.find(line =>
    /college|school|department|computer science/i.test(line) &&
    !/\b[A-Z]{2,5}\s*\d{3}[A-Z]?\b/.test(line) &&
    !/course|description|requirements/i.test(line)
  );

  return cleanOfferingUnit(possibleUnit || "-");
}

function parseTitleNearCourseCode(text: string, subjectCode: string, catalogNumber: string) {
  if (subjectCode === "-" || catalogNumber === "-") return "-";

  const lines = text.split("\n").map(x => x.trim()).filter(Boolean);
  const codeRegex = new RegExp(`\\b${subjectCode}\\s*${catalogNumber}\\b`);

  for (let i = 0; i < lines.length; i++) {
    if (codeRegex.test(lines[i])) {
      const sameLine = lines[i]
        .replace(codeRegex, "")
        .replace(/^[-–—:]\s*/, "")
        .trim();

      if (sameLine && sameLine !== "-") return sameLine;
      if (lines[i + 1]) return lines[i + 1];
    }
  }

  return "-";
}

async function main() {
  fs.mkdirSync("data/raw", { recursive: true });
  fs.mkdirSync("data/debug", { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    slowMo: 75,
  });

  const page = await browser.newPage();

  const startUrl = customUrl || BASE_URL;

  console.log(`Opening catalog: ${startUrl}`);
  await page.goto(startUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(3000);

  let baseRows: Record<string, string>[] = [];

  if (shouldDownloadCSV) {
    console.log("Downloading official CSV export...");

    const downloadPromise = page.waitForEvent("download");
    await page.getByText(/Export all results as CSV/i).click();

    const download = await downloadPromise;
    const downloadPath = await download.path();

    if (!downloadPath) {
      throw new Error("Could not access downloaded CSV file.");
    }

    const officialCSV = fs.readFileSync(downloadPath, "utf8");
    fs.writeFileSync(outCsv, officialCSV);
    fs.writeFileSync("data/raw/ua-catalog-official-export.csv", officialCSV);

    baseRows = parseCSV(officialCSV);
    console.log(`Official CSV rows loaded: ${baseRows.length}`);
    console.log(`Official CSV saved to: ${outCsv}`);
  } else {
    console.log("Skipping official CSV export.");
  }

  const baseRowsByCourseId = new Map(
    baseRows
      .filter(row => row["Course ID"])
      .map(row => [row["Course ID"], row])
  );
  const baseRowsByCourseCode = new Map(
    baseRows
      .map(row => [normalizedCourseCode(row["Subject code"], row["Catalog Number"]), row] as const)
      .filter(([code]) => Boolean(code))
  );

  if (!shouldScrapeDetails) {
    console.log("Detail scraping skipped. Pass --details to crawl individual course pages.");
    await browser.close();
    return;
  }

  const detailUrls: string[] = [];
  const seenUrls = new Set<string>();

  if (isCourseDetailUrl(startUrl)) {
    detailUrls.push(startUrl);
    seenUrls.add(startUrl);
    console.log(`Using direct course detail URL: ${startUrl}`);
  }

  while (!isCourseDetailUrl(startUrl)) {
    await page.waitForTimeout(500);

    const links = page.locator('a[href*="/courses/"]');
    const linkCount = await links.count();

    for (let i = 0; i < linkCount; i++) {
      const link = links.nth(i);
      const href = await link.getAttribute("href");

      if (!href) continue;
      if (href === "/courses" || href.endsWith("/courses")) continue;

      const linkText = await link.innerText().catch(() => "");
      const detailUrl = href.startsWith("http")
        ? href
        : `https://catalog.arizona.edu${href}`;

      if (
        (!courseCodeArg || compactCourseCode(linkText).includes(compactCourseCode(courseCodeArg))) &&
        !seenUrls.has(detailUrl)
      ) {
        seenUrls.add(detailUrl);
        detailUrls.push(detailUrl);
      }
    }

    console.log(`Collected ${detailUrls.length} detail URLs so far...`);

    const next = page.locator('button[aria-label="Next page"]').first();
    const hasNext = await next.isVisible().catch(() => false);
    const isDisabled = await next.isDisabled().catch(() => true);

    if (!hasNext || isDisabled) break;

    const firstBefore = await page
      .locator('a[href*="/courses/"]')
      .first()
      .getAttribute("href")
      .catch(() => null);

    await next.click();

    await page.waitForFunction(
      oldHref => {
        const first = document.querySelector('a[href*="/courses/"]') as HTMLAnchorElement | null;
        return first && first.getAttribute("href") !== oldHref;
      },
      firstBefore,
      { timeout: 10000 }
    ).catch(() => null);

    await page.waitForTimeout(500);
  }

  console.log(`Total detail URLs collected: ${detailUrls.length}`);

  const rows: Record<string, string>[] = [];
  const urlsToScrape = detailUrls.slice(0, Math.min(detailUrls.length, MAX_COURSES));

  for (let i = 0; i < urlsToScrape.length; i += MAX_CONCURRENT_PAGES) {
    const batch = urlsToScrape.slice(i, i + MAX_CONCURRENT_PAGES);

    const batchRows = await Promise.all(
      batch.map(async (detailUrl, batchIndex) => {
        const index = i + batchIndex;

        console.log(`Opening detail page ${index + 1}/${urlsToScrape.length}: ${detailUrl}`);

        const detail = await browser.newPage();

        await detail.goto(detailUrl, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });

        await detail.waitForTimeout(300);

        const text = await detail.locator("body").innerText();
        fs.writeFileSync(`data/debug/detail-${index + 1}.txt`, text);

        const identity = parseCourseIdentityFromText(text);
        const fallbackTitle = parseTitleNearCourseCode(
          text,
          identity.subjectCode,
          identity.catalogNumber
        );
        const courseId = getFieldAfterLabel(text, "Course ID");
        const courseCode = normalizedCourseCode(identity.subjectCode, identity.catalogNumber);
        const baseRow = baseRowsByCourseId.get(courseId)
          || baseRowsByCourseCode.get(courseCode)
          || {};

        const row: Record<string, string> = {
          "Course ID": cleanValue(
            "Course ID",
            choose(courseId, baseRow["Course ID"])
          ),

          "Subject code": cleanValue(
            "Subject code",
            choose(identity.subjectCode, baseRow["Subject code"])
          ),

          "Catalog Number": cleanValue(
            "Catalog Number",
            choose(identity.catalogNumber, baseRow["Catalog Number"])
          ),

          "Offering Unit": cleanValue(
            "Offering Unit",
            cleanOfferingUnit(
              choose(parseOfferingUnitFromText(text), baseRow["Offering Unit"])
            )
          ),

          "Course Title": cleanValue(
            "Course Title",
            choose(
              identity.courseTitle !== "-" ? identity.courseTitle : fallbackTitle,
              baseRow["Course Title"]
            )
          ),

          "Course Description": cleanValue(
            "Course Description",
            choose(getFieldAfterLabel(text, "Course Description"), baseRow["Course Description"])
          ),

          "Min Units": cleanValue(
            "Min Units",
            choose(getFieldAfterLabel(text, "Min Units"), baseRow["Min Units"])
          ),

          "Max Units": cleanValue(
            "Max Units",
            choose(getFieldAfterLabel(text, "Max Units"), baseRow["Max Units"])
          ),

          "Repeatable for Credit": cleanValue(
            "Repeatable for Credit",
            choose(getFieldAfterLabel(text, "Repeatable for Credit"), baseRow["Repeatable for Credit"])
          ),

          "Total Completions Allowed": cleanValue(
            "Total Completions Allowed",
            choose(
              getFieldAfterLabel(text, "Total Completions Allowed"),
              baseRow["Total Completions Allowed"]
            )
          ),

          "Total Units Allowed": cleanValue(
            "Total Units Allowed",
            choose(
              getFieldAfterLabel(text, "Total Units Allowed"),
              baseRow["Total Units Allowed"]
            )
          ),

          "Grading Basis": cleanValue(
            "Grading Basis",
            choose(getFieldAfterLabel(text, "Grading Basis"), baseRow["Grading Basis"])
          ),

          "Components": cleanValue(
            "Components",
            choose(getAllFieldsAfterLabel(text, "Component"), baseRow["Components"])
          ),

          "Course Attributes": cleanValue(
            "Course Attributes",
            choose(getFieldAfterLabel(text, "Course Attributes"), baseRow["Course Attributes"])
          ),

          "Enrollment Requirements": cleanValue(
            "Enrollment Requirements",
            choose(
              getFieldAfterLabel(text, "Enrollment Requirements"),
              baseRow["Enrollment Requirements"]
            )
          ),

          "Course Requisites": cleanValue(
            "Course Requisites",
            choose(getFieldAfterLabel(text, "Course Requisites"), baseRow["Course Requisites"])
          ),
        };

        console.log(
          `Added ${index + 1}: ${row["Subject code"]}${row["Catalog Number"]} - ${row["Course Title"]}`
        );

        await detail.close();

        return row;
      })
    );

    rows.push(...batchRows.filter(Boolean) as Record<string, string>[]);

    const finalCSV = [
      HEADERS.map(csvEscape).join(","),
      ...rows.map(row => HEADERS.map(h => csvEscape(row[h])).join(",")),
    ].join("\n");

    fs.writeFileSync(outCsv, finalCSV);
    fs.writeFileSync("data/raw/ua-catalog-scraped-test.csv", finalCSV);

    console.log(`Saved progress: ${rows.length}/${urlsToScrape.length}`);
  }

  console.log(`Done. Saved ${rows.length} detail-scraped courses to ${outCsv}`);

  await browser.close();
}

main().catch(err => {
  console.error("Scraper failed:", err);
  process.exit(1);
});
