/**
 * lib/gemini.ts
 * All Gemini API interactions.
 * Uses gemini-1.5-pro for plan generation and catalog parsing (long context).
 * Uses gemini-1.5-flash for chat (faster, cheaper).
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Course } from './db';

function client() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not set. Add it to .env.local');
  }
  return new GoogleGenerativeAI(key);
}

function tokenizeInterestText(text: string) {
  const stop = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'want', 'like',
    'about', 'into', 'course', 'courses', 'class', 'classes', 'student', 'learn',
    'interested', 'interest', 'good', 'best', 'recommend', 'recommendation'
  ]);

  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stop.has(word));
}

function courseSearchText(course: Course) {
  return [
    course.code,
    course.title,
    course.major,
    course.category,
    course.description,
    course.prereqs?.join(' '),
    course.offered?.join(' ')
  ].join(' ').toLowerCase();
}

function compactCourseLine(course: Course) {
  const description = String(course.description || '').replace(/\s+/g, ' ').slice(0, 180);
  return `${course.code} | ${course.title} | ${course.units} units | ${course.category} | ${description}`;
}

function relevantCoursesForInterestAdvisor(
  history: { role: 'user' | 'model'; parts: string }[],
  courses: Course[],
  maxCourses = 45
) {
  const userText = history
    .filter(item => item.role === 'user')
    .map(item => item.parts)
    .join(' ');
  const terms = tokenizeInterestText(userText);

  const scored = courses.map(course => {
    const text = courseSearchText(course);
    const code = String(course.code || '');
    const isCsc = code.startsWith('CSC ');
    const category = String(course.category || '').toLowerCase();
    let score = isCsc ? 4 : 0;

    if (/elective|area|core|capstone|systems|theory|software|data|ai|security/i.test(category)) score += 2;
    for (const term of terms) {
      if (text.includes(term)) score += 3;
    }
    if (/ai|artificial|machine|data|security|game|web|software|systems|theory|database/.test(text)) score += 1;

    return { course, score };
  });

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || String(a.course.code).localeCompare(String(b.course.code)))
    .slice(0, maxCourses)
    .map(item => item.course);
}

// ─────────────────────────────────────────────────────────────────────────────
// DEGREE PLAN GENERATION
// ─────────────────────────────────────────────────────────────────────────────
export interface PlanResult {
  feasibility: 'High' | 'Medium' | 'Low';
  estimatedGraduationTerm: string;
  remainingUnits: number;
  completedCourses: string[];
  riskFlags: string[];
  semesters: {
    term: string;
    totalUnits: number;
    courses: { code: string; title: string; units: number; warnings: string[] }[];
  }[];
  requirements: { name: string; status: 'Satisfied' | 'Remaining'; url: string }[];
  recommendations: { code: string; title: string; sections: number; modality: string; instructors: string[] }[];
}

export async function generateDegreePlan(opts: {
  transcriptText: string;
  major: string;
  secondMajor?: string;
  standing: string;
  gradTerm: string;
  maxUnits: number;
  includeSummer: boolean;
  courses: Course[];
}): Promise<PlanResult> {
  const model = client().getGenerativeModel({ model: 'gemini-2.5-flash' });

  const relevantCourses = opts.courses.filter(
    c => c.major === opts.major || c.major === opts.secondMajor
  );

  const catalog = relevantCourses
    .map(c => `${c.code} | "${c.title}" | ${c.units}cr | ${c.category} | prereqs:[${c.prereqs.join(',')||'none'}] | offered:[${c.offered.join('/')}] | ${c.description}`)
    .join('\n');

  const prompt = `You are a university academic advisor AI. Analyze the student transcript and build a realistic semester-by-semester degree completion plan.

## Student Profile
- Primary Major: ${opts.major}
- Second Major / Minor: ${opts.secondMajor || 'None'}
- Standing: ${opts.standing}
- Target Graduation: ${opts.gradTerm}
- Max Units Per Semester: ${opts.maxUnits}
- Include Summer: ${opts.includeSummer ? 'Yes' : 'No'}

## Transcript
${opts.transcriptText}

## Course Catalog (${relevantCourses.length} courses for this major)
${catalog || 'No courses found in the database for this major. Use general knowledge.'}

## Rules
1. Parse the transcript — identify every completed course and its grade.
2. Map completed courses to requirements and mark them Satisfied.
3. Schedule remaining required courses respecting ALL prerequisite chains.
4. Never put a course in a semester before its prereqs are met.
5. Keep each semester at or below ${opts.maxUnits} units.
6. ${opts.includeSummer ? 'You may use summer semesters for lighter loads.' : 'Do NOT schedule summer semesters.'}
7. Identify scheduling risks (courses offered only once/year, tight chains, etc).
8. "recommendations" = courses available next semester (realistically 1-4 sections each).

## Response — valid JSON ONLY, no markdown fences, no commentary:
{
  "feasibility": "High",
  "estimatedGraduationTerm": "Spring 2027",
  "remainingUnits": 42,
  "completedCourses": ["CSC 110", "MATH 122B"],
  "riskFlags": ["MATH 355 only offered Fall — plan accordingly"],
  "semesters": [
    {
      "term": "Fall 2025",
      "totalUnits": 15,
      "courses": [
        {"code":"MATH 313","title":"Introduction to Proofs","units":3,"warnings":[]}
      ]
    }
  ],
  "requirements": [
    {"name":"MATH 122A/B — Calculus I","status":"Satisfied","url":"https://catalog.arizona.edu"},
    {"name":"MATH 313 — Intro to Proofs","status":"Remaining","url":"https://catalog.arizona.edu"}
  ],
  "recommendations": [
    {"code":"MATH 313","title":"Introduction to Proofs","sections":3,"modality":"In Person","instructors":["TBD"]}
  ]
}`;

  const res  = await model.generateContent(prompt);
  const text = res.response.text().trim().replace(/^```json\s*/i,'').replace(/```\s*$/i,'').trim();
  try {
    return JSON.parse(text) as PlanResult;
  } catch {
    throw new Error(`Gemini returned invalid JSON.\n\nFirst 600 chars:\n${text.slice(0,600)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG PDF PARSING
// ─────────────────────────────────────────────────────────────────────────────
export async function parseCatalogText(rawText: string, defaultMajor?: string): Promise<Course[]> {
  const model = client().getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are parsing a university course catalog. Extract every course you find.

## Catalog Text (first 30,000 chars)
${rawText.slice(0, 30000)}

## Instructions
For each course, extract:
- code        — e.g. "MATH 355"
- title       — e.g. "Linear Algebra"
- units       — integer (default 3 if unknown)
- category    — infer from context: "Core", "Elective", "Lab", "Capstone", etc.
- major       — degree program (infer from section headers; default: "${defaultMajor || 'General'}")
- description — 1-2 sentence summary
- prereqs     — array of course codes, e.g. ["MATH 254"] (empty array if none)
- offered     — array from ["Fall","Spring","Summer"] (default ["Fall","Spring"])
- syllabus    — URL if present, else ""

## Response — JSON array ONLY, no markdown:
[{"code":"MATH 355","title":"Linear Algebra","units":3,"category":"Algebra","major":"Mathematics (BA)","description":"Vector spaces and linear transformations.","prereqs":["MATH 313"],"offered":["Fall"],"syllabus":""}]`;

  const res  = await model.generateContent(prompt);
  const text = res.response.text().trim().replace(/^```json\s*/i,'').replace(/```\s*$/i,'').trim();
  try {
    return JSON.parse(text) as Course[];
  } catch {
    throw new Error(`Gemini returned invalid JSON during catalog parse.\n${text.slice(0,400)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEREST CHATBOT TURN
// ─────────────────────────────────────────────────────────────────────────────
export async function chatAdvisorTurn(
  history: { role: 'user' | 'model'; parts: string }[],
  courses: Course[],
  electiveContext?: { requirement?: string; requirementTitle?: string; options?: string[] }
): Promise<string> {
  const relevantCourses = relevantCoursesForInterestAdvisor(history, courses);
  const courseList = relevantCourses.length ? relevantCourses : courses.slice(0, 30);
  const electiveFocus = electiveContext
    ? `\nCurrent plan elective slot: ${electiveContext.requirementTitle || 'Elective'} (${electiveContext.requirement || 'no requirement code'}).\nApproved option codes: ${(electiveContext.options || []).join(', ')}.\nRecommend only courses that satisfy this elective slot.`
    : '';
  const model = client().getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `You are a warm, knowledgeable university course advisor.
Goal: understand the student's interests through conversation, then recommend courses.
${electiveFocus}

Relevant course options (${courseList.length} shown from ${courses.length} loaded):
${courseList.map(compactCourseLine).join('\n')}

Rules:
- Have a natural 3-5 turn conversation. Ask about career goals, learning style, what excites them.
- After enough info (3+ exchanges), recommend 4-6 courses.
- Append picks at the very END of your message as:
PICKS:[{"code":"COURSE CODE","title":"Course title","reason":"1-sentence personalized reason","match":85}]
- match is 0-100. Only use courses from the list above. Keep chat text to 2-4 sentences.`,
  });

  // Build history without the last message (we send it as the new turn)
  const chatHistory = history.slice(0, -1).map(m => ({
    role: m.role,
    parts: [{ text: m.parts }],
  })).slice(-6);

  const chat  = model.startChat({ history: chatHistory });
  const result = await chat.sendMessage(history[history.length - 1].parts);
  return result.response.text();
}
