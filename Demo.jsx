// UA DegreePlan Copilot - Single file React artifact
import { useState, useEffect, useRef } from "react";

// ── Mock Data ──────────────────────────────────────────────────────────────
const MOCK_RESULT = {
  feasibility: "High",
  estimatedGraduationTerm: "Spring 2027",
  remainingUnits: 42,
  riskFlags: [
    "Prereq chain tight for MATH 413",
    "Summer enrollment recommended for smooth graduation",
    "MATH 355 only offered Fall semesters — plan accordingly",
  ],
  semesters: [
    {
      term: "Fall 2025", totalUnits: 16,
      courses: [
        { code: "MATH 313", title: "Introduction to Proofs", units: 3, warnings: [] },
        { code: "MATH 323", title: "Real Analysis I", units: 3, warnings: ["Prereq: MATH 254 required"] },
        { code: "CSC 335", title: "OO Programming & Design", units: 3, warnings: [] },
        { code: "CSC 345", title: "Analysis of Discrete Structures", units: 3, warnings: [] },
        { code: "ENGL 308", title: "Technical Writing", units: 3, warnings: [] },
        { code: "GEN ED", title: "Traditions & Cultures Elective", units: 1, warnings: [] },
      ],
    },
    {
      term: "Spring 2026", totalUnits: 15,
      courses: [
        { code: "MATH 324", title: "Real Analysis II", units: 3, warnings: ["Prereq pending: MATH 323"] },
        { code: "MATH 355", title: "Linear Algebra", units: 3, warnings: ["Rarely offered — Fall only"] },
        { code: "CSC 422", title: "Parallel & Distributed Programming", units: 3, warnings: [] },
        { code: "CSC 460", title: "Database Design", units: 3, warnings: [] },
        { code: "MATH ELEC", title: "Mathematics Upper Div Elective", units: 3, warnings: [] },
      ],
    },
    {
      term: "Summer 2026", totalUnits: 6,
      courses: [
        { code: "MATH 413", title: "Abstract Algebra I", units: 3, warnings: ["High workload — summer ideal"] },
        { code: "MATH ELEC", title: "Applied Mathematics Elective", units: 3, warnings: [] },
      ],
    },
    {
      term: "Fall 2026", totalUnits: 16,
      courses: [
        { code: "MATH 414", title: "Abstract Algebra II", units: 3, warnings: ["Prereq: MATH 413"] },
        { code: "MATH 425", title: "Complex Variables", units: 3, warnings: [] },
        { code: "CSC 483", title: "Natural Language Processing", units: 3, warnings: [] },
        { code: "CSC ELEC", title: "CS Upper Division Elective", units: 3, warnings: [] },
        { code: "INDV 101", title: "Individuals & Societies", units: 4, warnings: [] },
      ],
    },
    {
      term: "Spring 2027", totalUnits: 5,
      courses: [
        { code: "CSC 498", title: "Senior Capstone Project", units: 3, warnings: [] },
        { code: "MATH ELEC", title: "Mathematics Elective", units: 2, warnings: [] },
      ],
    },
  ],
  requirements: [
    { name: "MATH 122A/B — Calculus I", status: "Satisfied", url: "https://catalog.arizona.edu" },
    { name: "MATH 129 — Calculus II", status: "Satisfied", url: "https://catalog.arizona.edu" },
    { name: "MATH 223 — Vector Calculus", status: "Satisfied", url: "https://catalog.arizona.edu" },
    { name: "MATH 254 — Intro to ODE", status: "Satisfied", url: "https://catalog.arizona.edu" },
    { name: "MATH 313 — Intro to Proofs", status: "Remaining", url: "https://catalog.arizona.edu" },
    { name: "MATH 323/324 — Real Analysis I & II", status: "Remaining", url: "https://catalog.arizona.edu" },
    { name: "MATH 355 — Linear Algebra", status: "Remaining", url: "https://catalog.arizona.edu" },
    { name: "MATH 413/414 — Abstract Algebra", status: "Remaining", url: "https://catalog.arizona.edu" },
    { name: "3 Upper Division Math Electives", status: "Remaining", url: "https://math.arizona.edu" },
    { name: "Mathematics BA/BS Declaration", status: "Remaining", url: "https://math.arizona.edu/advising" },
  ],
  recommendations: [
    { code: "MATH 313", title: "Introduction to Proofs", sections: 4, modality: "In Person", instructors: ["Dr. Karolina Alexopoulos", "Dr. Marcus Webb", "Dr. Priya Sundaresan"] },
    { code: "MATH 323", title: "Real Analysis I", sections: 3, modality: "In Person", instructors: ["Dr. Jana Horáková", "Dr. Thomas Fenn"] },
    { code: "MATH 355", title: "Linear Algebra", sections: 2, modality: "Hybrid", instructors: ["Dr. Samuel Okonkwo", "Dr. Lena Fischer"] },
    { code: "MATH 413", title: "Abstract Algebra I", sections: 2, modality: "In Person", instructors: ["Dr. Ricardo Morales"] },
    { code: "MATH 425", title: "Complex Variables", sections: 1, modality: "In Person", instructors: ["Dr. Weilin Zhang"] },
    { code: "MATH 464", title: "Theory of Probability", sections: 2, modality: "In Person / Online", instructors: ["Dr. Elena Vasquez", "Dr. Kofi Asante"] },
  ],
};

const SAMPLE_TRANSCRIPT = `UNIVERSITY OF ARIZONA — UNOFFICIAL TRANSCRIPT

Student: Jane Doe  |  ID: 123456789
Major: Computer Science (BS)  |  Standing: Junior  |  GPA: 3.72

━━━ COMPLETED COURSEWORK ━━━━━━━━━━━━━━━━━━━━━━

Fall 2023
  CSC 110   Intro to Computer Programming        3  A
  MATH 122B Calculus I                           4  A−
  ENGL 101  First Year Composition               3  B+
  INDV 101  Individuals & Societies              3  A

Spring 2024
  CSC 120   Intro to Computer Programming II     3  A
  MATH 129  Calculus II                          4  B+
  PHYS 141  Introductory Mechanics               4  B

Fall 2024
  CSC 210   Software Development                 3  A
  CSC 245   Object-Oriented Programming I        3  A−
  MATH 223  Vector Calculus III                  4  A
  PHYS 241  Intro to Electromagnetics            4  B+

Spring 2025
  CSC 252   Intro to Computer Organization       3  B+
  CSC 335   OO Programming & Design              3  A
  MATH 254  Intro to Ordinary Diff Eqs           3  A
  TRAD 104  Traditions & Cultures                3  B+

━━━ TRANSFER CREDIT ━━━━━━━━━━━━━━━━━━━━━━━━━━━
  AP Calculus AB  →  MATH 122A equivalent        4  CR

TOTAL COMPLETED UNITS: 58`;

const LOADING_MSGS = [
  "Parsing transcript…",
  "Mapping completed requirements…",
  "Checking prerequisite chains…",
  "Analyzing Math BA/BS requirements…",
  "Optimizing semester load…",
  "Flagging scheduling conflicts…",
  "Building your plan…",
];

// ── Helpers ────────────────────────────────────────────────────────────────
function exportCSV(result) {
  const rows = [
    ["UA DegreePlan Copilot Export"],
    ["Feasibility", result.feasibility],
    ["Est. Graduation", result.estimatedGraduationTerm],
    ["Remaining Units", result.remainingUnits],
    [],
    ["SEMESTER PLAN"],
    ["Term", "Course Code", "Title", "Units", "Warnings"],
    ...result.semesters.flatMap(s =>
      s.courses.map(c => [s.term, c.code, c.title, c.units, c.warnings.join("; ")])
    ),
    [],
    ["REQUIREMENTS"],
    ["Requirement", "Status"],
    ...result.requirements.map(r => [r.name, r.status]),
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "ua-degreeplan.csv";
  a.click();
}

// ── Styles (injected) ──────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ua-blue: #0C234B;
    --ua-red: #AB0520;
    --ua-copper: #B3781B;
    --ua-sage: #3D6B4F;
    --ua-sky: #1A6FA0;
    --ua-warm: #F5F0E8;
    --ua-desert: #E8D9BC;
    --radius: 12px;
    --shadow-sm: 0 1px 3px rgba(12,35,75,0.08), 0 1px 2px rgba(12,35,75,0.04);
    --shadow-md: 0 4px 16px rgba(12,35,75,0.10), 0 2px 4px rgba(12,35,75,0.06);
  }

  .app {
    font-family: 'DM Sans', system-ui, sans-serif;
    background: var(--ua-warm);
    background-image:
      radial-gradient(ellipse 80% 50% at 15% 0%, rgba(171,5,32,0.06) 0%, transparent 60%),
      radial-gradient(ellipse 60% 60% at 90% 90%, rgba(12,35,75,0.07) 0%, transparent 60%);
    min-height: 100vh;
    color: #1a1a2e;
    -webkit-font-smoothing: antialiased;
  }

  /* Header */
  .header {
    background: rgba(12,35,75,0.97);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    padding: 0 24px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .ua-mark {
    width: 34px; height: 34px; border-radius: 8px;
    background: var(--ua-red);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Playfair Display', serif;
    font-weight: 700; font-size: 13px; color: white;
    flex-shrink: 0;
  }
  .header-title { font-family: 'Playfair Display', serif; font-weight: 700; font-size: 16px; color: white; }
  .header-sub { font-size: 10px; color: rgba(255,255,255,0.45); margin-top: 1px; }
  .header-badges { display: flex; gap: 6px; margin-left: 8px; }
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 20px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.03em;
  }
  .badge-demo { background: rgba(179,120,27,0.2); color: #f0c060; border: 1px solid rgba(179,120,27,0.3); }
  .badge-live { background: rgba(61,107,79,0.3); color: #7ed9a0; border: 1px solid rgba(61,107,79,0.4); }
  .badge-gem { background: rgba(100,140,240,0.2); color: #a0c0ff; border: 1px solid rgba(100,140,240,0.25); }
  .header-right { display: flex; align-items: center; gap: 8px; }
  .btn-ghost-white {
    background: transparent; border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.7);
    padding: 4px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;
    font-family: inherit; display: flex; align-items: center; gap: 6px;
    transition: all .15s;
  }
  .btn-ghost-white:hover { background: rgba(255,255,255,0.08); color: white; }

  /* Layout */
  .main { max-width: 1280px; margin: 0 auto; padding: 24px 20px; }
  .layout { display: flex; gap: 20px; }
  .left-col { width: 340px; flex-shrink: 0; display: flex; flex-direction: column; gap: 14px; }
  .right-col { flex: 1; min-width: 0; }
  @media (max-width: 900px) {
    .layout { flex-direction: column; }
    .left-col { width: 100%; }
  }

  /* Cards */
  .card {
    background: white; border: 1px solid rgba(12,35,75,0.1);
    border-radius: var(--radius); box-shadow: var(--shadow-sm);
    overflow: hidden;
  }
  .card-header {
    padding: 14px 16px 10px;
    border-bottom: 1px solid rgba(12,35,75,0.06);
    display: flex; align-items: center; gap: 8px;
  }
  .card-title {
    font-family: 'Playfair Display', serif;
    font-size: 13px; font-weight: 700; color: var(--ua-blue);
    letter-spacing: -0.01em;
  }
  .card-body { padding: 14px 16px; }

  /* Form elements */
  .field { margin-bottom: 12px; }
  .field:last-child { margin-bottom: 0; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  label {
    display: block; font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase; color: #6b7280; margin-bottom: 5px;
  }
  select, textarea {
    width: 100%; padding: 7px 10px; border: 1px solid #dde3ee;
    border-radius: 7px; font-size: 13px; font-family: inherit;
    color: #1e293b; background: white;
    transition: border-color .15s, box-shadow .15s;
    outline: none; appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 9px center;
    padding-right: 28px;
  }
  select:focus, textarea:focus { border-color: var(--ua-blue); box-shadow: 0 0 0 3px rgba(12,35,75,0.08); }
  textarea {
    resize: none; height: 160px; font-size: 11px; font-family: 'JetBrains Mono', monospace;
    line-height: 1.6; background-image: none; padding-right: 10px;
    color: #334155;
  }

  /* Slider */
  .slider-wrap { position: relative; padding: 4px 0; }
  .slider-labels { display: flex; justify-content: space-between; font-size: 10px; color: #9ca3af; margin-top: 4px; }
  .slider-value { font-size: 13px; font-weight: 700; color: var(--ua-blue); font-variant-numeric: tabular-nums; }
  input[type=range] {
    -webkit-appearance: none; width: 100%; height: 4px;
    border-radius: 2px; background: #dde3ee; outline: none; cursor: pointer;
    background-image: linear-gradient(var(--ua-blue), var(--ua-blue));
    background-size: calc((var(--v, 16) - 12) / 7 * 100%) 100%;
    background-repeat: no-repeat;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%;
    background: var(--ua-blue); border: 2px solid white;
    box-shadow: 0 1px 4px rgba(12,35,75,0.3); cursor: pointer;
  }

  /* Toggle */
  .toggle-row {
    display: flex; align-items: center; justify-content: space-between;
    background: var(--ua-warm); border-radius: 8px; padding: 10px 12px;
  }
  .toggle-label { font-size: 12px; font-weight: 500; color: #374151; }
  .toggle-sub { font-size: 10px; color: #9ca3af; margin-top: 1px; }
  .toggle {
    position: relative; width: 36px; height: 20px; cursor: pointer;
  }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .toggle-track {
    position: absolute; inset: 0; border-radius: 10px;
    background: #d1d5db; transition: background .2s;
  }
  .toggle input:checked + .toggle-track { background: var(--ua-blue); }
  .toggle-thumb {
    position: absolute; top: 2px; left: 2px;
    width: 16px; height: 16px; border-radius: 50%;
    background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    transition: transform .2s;
  }
  .toggle input:checked ~ .toggle-thumb { transform: translateX(16px); }

  /* Tabs */
  .tabs-list {
    display: flex; background: #f1f5f9; border-radius: 8px; padding: 3px; gap: 2px;
    margin-bottom: 10px;
  }
  .tab-btn {
    flex: 1; padding: 5px 10px; border: none; background: transparent;
    border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer;
    font-family: inherit; color: #6b7280; transition: all .15s;
  }
  .tab-btn.active { background: white; color: var(--ua-blue); box-shadow: var(--shadow-sm); font-weight: 600; }

  /* Buttons */
  .btn-primary {
    width: 100%; height: 44px; background: var(--ua-blue);
    color: white; border: none; border-radius: 10px;
    font-size: 14px; font-weight: 600; font-family: inherit;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
    box-shadow: 0 4px 16px rgba(12,35,75,0.25);
    transition: all .15s; letter-spacing: -0.01em;
  }
  .btn-primary:hover:not(:disabled) { background: #0a1d40; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(12,35,75,0.3); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }

  .btn-secondary {
    flex: 1; height: 36px; background: white; border: 1px solid rgba(12,35,75,0.15);
    color: var(--ua-blue); border-radius: 8px; font-size: 12px; font-weight: 600;
    font-family: inherit; cursor: pointer; display: flex; align-items: center;
    justify-content: center; gap: 6px; transition: all .15s;
  }
  .btn-secondary:hover { background: rgba(12,35,75,0.04); }
  .btn-copper { color: var(--ua-copper); border-color: rgba(179,120,27,0.2); }
  .btn-copper:hover { background: rgba(179,120,27,0.05); }
  .btn-outline-sm {
    padding: 4px 10px; background: transparent; border: 1px solid rgba(12,35,75,0.15);
    border-radius: 6px; font-size: 11px; font-weight: 600; color: var(--ua-blue);
    cursor: pointer; font-family: inherit; transition: all .15s; display: flex; align-items: center; gap: 4px;
  }
  .btn-outline-sm:hover { background: rgba(12,35,75,0.05); }
  .btn-sample {
    width: 100%; padding: 7px; background: transparent; border: 1px dashed rgba(12,35,75,0.2);
    border-radius: 7px; font-size: 11px; font-weight: 600; color: var(--ua-blue);
    cursor: pointer; font-family: inherit; transition: all .15s; margin-top: 6px;
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .btn-sample:hover { background: rgba(12,35,75,0.04); border-style: solid; }

  /* Context hint */
  .context-hint {
    background: rgba(232,217,188,0.4); border: 1px solid rgba(179,120,27,0.2);
    border-radius: 10px; padding: 10px 14px; text-align: center;
    font-size: 12px; color: #6b5020; line-height: 1.5;
  }
  .context-hint a { color: var(--ua-sky); text-decoration: none; }
  .context-hint a:hover { text-decoration: underline; }

  /* Empty / Loading state */
  .panel-empty {
    background: white; border: 1px solid rgba(12,35,75,0.08); border-radius: 16px;
    min-height: 520px; display: flex; align-items: center; justify-content: center;
    box-shadow: var(--shadow-sm);
  }
  .empty-inner { text-align: center; padding: 40px 20px; }
  .empty-icon {
    width: 72px; height: 72px; border-radius: 18px; background: rgba(12,35,75,0.08);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 20px; font-size: 32px; position: relative;
  }
  .empty-icon-badge {
    position: absolute; bottom: -4px; right: -4px; width: 24px; height: 24px;
    border-radius: 50%; background: var(--ua-red); color: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 800; border: 2px solid white;
  }
  .empty-title { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: var(--ua-blue); margin-bottom: 10px; }
  .empty-desc { font-size: 13px; color: #6b7280; line-height: 1.6; max-width: 280px; margin: 0 auto; }
  .empty-arrow { font-size: 12px; color: #9ca3af; margin-top: 14px; }

  /* Spinner */
  .spinner-wrap { text-align: center; padding: 60px 20px; }
  .spinner { position: relative; width: 52px; height: 52px; margin: 0 auto 20px; }
  .spinner-ring {
    position: absolute; inset: 0; border-radius: 50%;
    border: 3px solid transparent;
    animation: spin 1.1s linear infinite;
  }
  .spinner-ring-outer { border-top-color: var(--ua-blue); border-right-color: var(--ua-red); }
  .spinner-ring-inner {
    inset: 7px; border-bottom-color: var(--ua-copper);
    animation-direction: reverse; animation-duration: 0.7s;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner-msg { font-size: 13px; font-weight: 600; color: #374151; min-height: 20px; }
  .spinner-sub { font-size: 11px; color: #9ca3af; margin-top: 4px; }

  /* Results */
  .results { display: flex; flex-direction: column; gap: 24px; animation: fadeUp .4s ease-out; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  /* Summary bar */
  .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px; }
  .summary-card {
    background: white; border: 1px solid rgba(12,35,75,0.1);
    border-radius: 12px; padding: 14px; box-shadow: var(--shadow-sm);
  }
  .summary-card-label {
    font-size: 9px; font-weight: 700; letter-spacing: 0.07em;
    text-transform: uppercase; color: #9ca3af; margin-bottom: 6px;
    display: flex; align-items: center; gap: 5px;
  }
  .summary-card-value {
    font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 700;
    line-height: 1; color: var(--ua-blue);
  }
  .pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 20px;
    font-size: 12px; font-weight: 700;
  }
  .pill-dot { width: 7px; height: 7px; border-radius: 50%; }
  .pill-high { background: #d1fae5; color: #065f46; }
  .pill-high .pill-dot { background: #10b981; }
  .pill-medium { background: #fef3c7; color: #92400e; }
  .pill-medium .pill-dot { background: #f59e0b; }
  .pill-low { background: #fee2e2; color: #991b1b; }
  .pill-low .pill-dot { background: #ef4444; }

  .risk-box {
    background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 14px;
  }
  .risk-title { font-size: 10px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; color: #92400e; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
  .risk-item { display: flex; align-items: flex-start; gap: 7px; font-size: 12px; color: #78350f; margin-bottom: 5px; line-height: 1.4; }
  .risk-item:last-child { margin-bottom: 0; }
  .risk-dot { width: 5px; height: 5px; border-radius: 50%; background: #f59e0b; flex-shrink: 0; margin-top: 5px; }

  /* Section headers */
  .section-header {
    font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
    color: #9ca3af; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;
  }
  .divider { height: 1px; background: rgba(12,35,75,0.08); }

  /* Semester grid */
  .sem-grid { display: flex; flex-direction: column; gap: 10px; }
  .sem-card {
    background: white; border-radius: 12px; border: 1px solid rgba(12,35,75,0.08);
    border-left: 4px solid; overflow: hidden; box-shadow: var(--shadow-sm);
  }
  .sem-fall { border-left-color: var(--ua-blue); }
  .sem-spring { border-left-color: var(--ua-sage); }
  .sem-summer { border-left-color: var(--ua-copper); }
  .sem-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; border-bottom: 1px solid rgba(12,35,75,0.06);
    background: rgba(12,35,75,0.02);
  }
  .sem-header-left { display: flex; align-items: center; gap: 8px; }
  .sem-season-badge {
    padding: 2px 8px; border-radius: 5px; font-size: 10px; font-weight: 800;
    letter-spacing: 0.04em; text-transform: uppercase;
  }
  .badge-fall { background: var(--ua-blue); color: white; }
  .badge-spring { background: var(--ua-sage); color: white; }
  .badge-summer { background: var(--ua-copper); color: white; }
  .sem-term { font-size: 13px; font-weight: 600; color: #1e293b; }
  .sem-units { font-size: 11px; font-weight: 700; color: #6b7280; font-variant-numeric: tabular-nums; }
  .sem-courses { padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; }
  .course-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .course-left { flex: 1; min-width: 0; }
  .course-code { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; color: var(--ua-blue); }
  .course-title { font-size: 11px; color: #6b7280; margin-top: 1px; }
  .course-warn { font-size: 10px; color: #b45309; margin-top: 2px; display: flex; align-items: center; gap: 4px; }
  .course-units { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #9ca3af; flex-shrink: 0; }

  /* Requirements table */
  .req-progress-wrap { margin-bottom: 10px; }
  .req-progress-bar { height: 5px; border-radius: 3px; background: #e5e7eb; overflow: hidden; }
  .req-progress-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--ua-sage), #4ade80); transition: width .5s ease; }
  .req-progress-label { display: flex; justify-content: space-between; font-size: 10px; color: #9ca3af; margin-top: 4px; }
  .table-wrap { background: white; border-radius: 10px; border: 1px solid rgba(12,35,75,0.08); overflow: hidden; box-shadow: var(--shadow-sm); }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f8fafc; padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #9ca3af; border-bottom: 1px solid #e5e7eb; }
  td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #f1f5f9; color: #374151; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #fafbfe; }
  .status-satisfied { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: #065f46; }
  .status-remaining { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: #92400e; }
  .req-link { color: var(--ua-sky); font-size: 11px; text-decoration: none; display: inline-flex; align-items: center; gap: 3px; }
  .req-link:hover { text-decoration: underline; }

  /* Recommendations table */
  .rec-term-badge { padding: 2px 8px; border-radius: 20px; background: rgba(12,35,75,0.08); color: var(--ua-blue); font-size: 11px; font-weight: 700; }
  .modality-ip { color: var(--ua-sage); }
  .modality-hybrid { color: #b45309; }
  .modality-online { color: #7c3aed; }
  .btn-faculty { padding: 3px 10px; background: rgba(12,35,75,0.06); border: none; border-radius: 6px; font-size: 11px; font-weight: 600; color: var(--ua-blue); cursor: pointer; font-family: inherit; transition: background .15s; }
  .btn-faculty:hover { background: rgba(12,35,75,0.12); }

  /* Modal */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(10,20,50,0.6);
    backdrop-filter: blur(4px); z-index: 200;
    display: flex; align-items: center; justify-content: center;
    animation: fadeIn .15s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal {
    background: white; border-radius: 16px; width: 360px; max-width: calc(100vw - 32px);
    box-shadow: 0 24px 60px rgba(10,20,50,0.25); overflow: hidden;
    animation: scaleIn .2s ease;
  }
  @keyframes scaleIn { from { transform: scale(.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .modal-header {
    background: var(--ua-blue); padding: 16px 20px;
    display: flex; align-items: flex-start; justify-content: space-between;
  }
  .modal-title { font-family: 'Playfair Display', serif; font-size: 16px; font-weight: 700; color: white; }
  .modal-subtitle { font-size: 11px; color: rgba(255,255,255,0.55); margin-top: 2px; }
  .modal-close { background: rgba(255,255,255,0.12); border: none; width: 26px; height: 26px; border-radius: 6px; color: white; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; }
  .modal-close:hover { background: rgba(255,255,255,0.2); }
  .modal-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 8px; }
  .instructor-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; background: var(--ua-warm); }
  .instructor-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--ua-blue); color: white; font-family: 'Playfair Display', serif; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .instructor-name { font-size: 13px; font-weight: 500; color: #1e293b; }
  .instructor-rmp { font-size: 11px; color: var(--ua-sky); }
  .instructor-rmp a { color: inherit; text-decoration: none; }
  .instructor-rmp a:hover { text-decoration: underline; }
  .modal-footer { padding: 10px 20px 16px; text-align: center; font-size: 11px; color: #9ca3af; }
  .modal-footer a { color: var(--ua-sky); text-decoration: none; }
  .modal-footer a:hover { text-decoration: underline; }

  /* Toast */
  .toast {
    position: fixed; bottom: 20px; right: 20px; z-index: 300;
    background: white; border: 1px solid rgba(12,35,75,0.12);
    border-radius: 10px; padding: 12px 16px; box-shadow: var(--shadow-md);
    max-width: 320px; animation: slideUp .3s ease;
    display: flex; gap: 10px; align-items: flex-start;
  }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .toast-icon { width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; margin-top: 1px; }
  .toast-success { background: #d1fae5; color: #065f46; }
  .toast-error { background: #fee2e2; color: #991b1b; }
  .toast-info { background: rgba(12,35,75,0.1); color: var(--ua-blue); }
  .toast-title { font-size: 13px; font-weight: 700; color: #1e293b; }
  .toast-desc { font-size: 12px; color: #6b7280; margin-top: 2px; }

  /* Export */
  .export-row { display: flex; gap: 8px; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
`;

// ── Tiny icon components ───────────────────────────────────────────────────
const Icon = ({ d, size = 14, stroke = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const SparklesIcon = () => <Icon d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />;
const GradCapIcon = () => <Icon d="M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />;
const FileIcon = () => <Icon d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z M14 2v6h6" />;
const WarnIcon = () => <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01" />;
const CheckIcon = () => <Icon d="M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3" />;
const CircleIcon = () => <Icon d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" />;
const DownloadIcon = () => <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" />;
const LinkIcon = () => <Icon d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />;
const UsersIcon = () => <Icon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" />;
const RefreshIcon = () => <Icon d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16 M8 16H3v5" />;
const BookIcon = () => <Icon d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />;
const ClockIcon = () => <Icon d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M12 6v6l4 2" />;

// ── Toast ────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="toast">
      <div className={`toast-icon toast-${msg.type}`}>
        {msg.type === "success" ? "✓" : msg.type === "error" ? "✕" : "i"}
      </div>
      <div>
        <div className="toast-title">{msg.title}</div>
        {msg.desc && <div className="toast-desc">{msg.desc}</div>}
      </div>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  // State
  const [profile, setProfileField] = useState({
    standing: "Junior",
    major: "Computer Science (BS)",
    secondMajor: "Mathematics (BA)",
    gradTerm: "Spring 2027",
    maxUnits: 16,
    summer: false,
  });
  const [transcript, setTranscript] = useState("");
  const [transcriptTab, setTranscriptTab] = useState("paste");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [toast, setToast] = useState(null);
  const [modalCourse, setModalCourse] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const sliderRef = useRef(null);

  const setP = (k, v) => setProfileField(p => ({ ...p, [k]: v }));
  const showToast = (title, desc, type = "success") => setToast({ title, desc, type });

  // Loading message cycle
  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => setLoadingMsg(m => (m + 1) % LOADING_MSGS.length), 900);
    return () => clearInterval(iv);
  }, [loading]);

  // Slider fill
  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.style.setProperty("--v", profile.maxUnits);
    }
  }, [profile.maxUnits]);

  const gradTerms = [];
  for (let y = 2026; y <= 2030; y++) {
    gradTerms.push(`Spring ${y}`, `Fall ${y}`);
  }

  const handleGenerate = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      await new Promise(r => setTimeout(r, 1400));
      const plan = {
        ...MOCK_RESULT,
        estimatedGraduationTerm: profile.gradTerm,
        semesters: profile.summer
          ? MOCK_RESULT.semesters
          : MOCK_RESULT.semesters.filter(s => !s.term.includes("Summer")),
      };
      setResult(plan);
      showToast("Plan generated!", "Your personalized roadmap is ready.", "success");
    } catch (e) {
      showToast("Error", "Could not generate plan.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setTranscript("");
    setProfileField({ standing: "Junior", major: "Computer Science (BS)", secondMajor: "Mathematics (BA)", gradTerm: "Spring 2027", maxUnits: 16, summer: false });
    showToast("Reset", "Everything cleared.", "info");
  };

  const satisfiedCount = result ? result.requirements.filter(r => r.status === "Satisfied").length : 0;
  const totalReqs = result ? result.requirements.length : 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="app">

        {/* ── Header ── */}
        <header className="header">
          <div className="header-left">
            <div className="ua-mark">UA</div>
            <div>
              <div className="header-title">DegreePlan Copilot</div>
              <div className="header-sub">University of Arizona</div>
            </div>
            <div className="header-badges">
              <span className={`badge ${demoMode ? "badge-demo" : "badge-live"}`}>
                {demoMode ? "⚡ DEMO" : "🟢 LIVE"}
              </span>
              <span className="badge badge-gem">✦ Gemini</span>
            </div>
          </div>
          <div className="header-right">
            <button className="btn-ghost-white" onClick={() => { setDemoMode(d => !d); showToast(demoMode ? "Live mode" : "Demo mode", demoMode ? "Will call /api/plan" : "Using mock data", "info"); }}>
              {demoMode ? "⟳ Mock" : "◉ Live"}
            </button>
            <button className="btn-ghost-white" onClick={handleReset}>
              <RefreshIcon /> Reset
            </button>
          </div>
        </header>

        <div className="main">
          <div className="layout">

            {/* ── LEFT COLUMN ── */}
            <div className="left-col">

              {/* Profile card */}
              <div className="card">
                <div className="card-header">
                  <GradCapIcon />
                  <span className="card-title">Student Profile</span>
                </div>
                <div className="card-body">
                  <div className="field field-row">
                    <div>
                      <label>Standing</label>
                      <select value={profile.standing} onChange={e => setP("standing", e.target.value)}>
                        {["Freshman","Sophomore","Junior","Senior"].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label>Primary Major</label>
                      <select value={profile.major} onChange={e => setP("major", e.target.value)}>
                        <option>Computer Science (BS)</option>
                      </select>
                    </div>
                  </div>

                  <div className="field">
                    <label>Second Major</label>
                    <select value={profile.secondMajor} onChange={e => setP("secondMajor", e.target.value)}>
                      <option>Mathematics (BA)</option>
                      <option>Mathematics (BS)</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>Expected Graduation</label>
                    <select value={profile.gradTerm} onChange={e => setP("gradTerm", e.target.value)}>
                      {gradTerms.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="field">
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <label style={{ margin: 0 }}>Max Units / Semester</label>
                      <span className="slider-value">{profile.maxUnits} units</span>
                    </div>
                    <div className="slider-wrap">
                      <input ref={sliderRef} type="range" min={12} max={19} step={1}
                        value={profile.maxUnits}
                        onChange={e => setP("maxUnits", parseInt(e.target.value))}
                        style={{ "--v": profile.maxUnits }}
                      />
                      <div className="slider-labels"><span>12</span><span>19</span></div>
                    </div>
                  </div>

                  <div className="toggle-row">
                    <div>
                      <div className="toggle-label">Summer Sessions</div>
                      <div className="toggle-sub">Include summer in plan</div>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={profile.summer} onChange={e => setP("summer", e.target.checked)} />
                      <div className="toggle-track" />
                      <div className="toggle-thumb" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Transcript card */}
              <div className="card">
                <div className="card-header">
                  <FileIcon />
                  <span className="card-title">Transcript</span>
                </div>
                <div className="card-body">
                  <div className="tabs-list">
                    <button className={`tab-btn ${transcriptTab === "paste" ? "active" : ""}`} onClick={() => setTranscriptTab("paste")}>Paste Text</button>
                    <button className={`tab-btn ${transcriptTab === "upload" ? "active" : ""}`} onClick={() => setTranscriptTab("upload")}>Upload PDF</button>
                  </div>

                  {transcriptTab === "paste" ? (
                    <>
                      <textarea value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="Paste your unofficial transcript here…" />
                      <button className="btn-sample" onClick={() => setTranscript(SAMPLE_TRANSCRIPT)}>
                        <SparklesIcon /> Load sample transcript
                      </button>
                    </>
                  ) : (
                    <div style={{ textAlign:"center", padding:"30px 0" }}>
                      <div style={{ fontSize:32, marginBottom:8 }}>📄</div>
                      <p style={{ fontSize:12, color:"#6b7280" }}>PDF upload in production mode</p>
                      <p style={{ fontSize:11, color:"#9ca3af", marginTop:4 }}>Use "Paste Text" for demo</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Generate button */}
              <button className="btn-primary" onClick={handleGenerate} disabled={!transcript.trim() || loading}>
                {loading ? (
                  <><div style={{ width:16, height:16, border:"2px solid rgba(255,255,255,.3)", borderTopColor:"white", borderRadius:"50%", animation:"spin .8s linear infinite" }} /> Generating…</>
                ) : (
                  <><SparklesIcon /> Generate Plan</>
                )}
              </button>
              {!transcript.trim() && <p style={{ fontSize:11, color:"#9ca3af", textAlign:"center", marginTop:-4 }}>Load a sample transcript to try the demo</p>}

              {/* Context hint */}
              <div className="context-hint">
                <strong style={{ color: "var(--ua-blue)" }}>CS (BS)</strong> → adding <strong style={{ color:"var(--ua-copper)" }}>Mathematics</strong> second major<br />
                <a href="https://math.arizona.edu/undergraduate/degrees" target="_blank" rel="noopener noreferrer">
                  📖 UA Math degree requirements ↗
                </a>
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="right-col">
              {loading ? (
                <div className="panel-empty">
                  <div className="spinner-wrap">
                    <div className="spinner">
                      <div className="spinner-ring spinner-ring-outer" />
                      <div className="spinner-ring spinner-ring-inner" />
                    </div>
                    <div className="spinner-msg">{LOADING_MSGS[loadingMsg]}</div>
                    <div className="spinner-sub">Powered by Gemini</div>
                  </div>
                </div>
              ) : result ? (
                <div className="results">

                  {/* ── Summary ── */}
                  <div>
                    <div className="summary-grid">
                      <div className="summary-card" style={{ borderTop: "3px solid var(--ua-blue)" }}>
                        <div className="summary-card-label"><span style={{ color: result.feasibility === "High" ? "#10b981" : result.feasibility === "Medium" ? "#f59e0b" : "#ef4444" }}>●</span> Feasibility</div>
                        <span className={`pill pill-${result.feasibility.toLowerCase()}`}>
                          <span className="pill-dot" />{result.feasibility}
                        </span>
                      </div>
                      <div className="summary-card" style={{ borderTop: "3px solid var(--ua-copper)" }}>
                        <div className="summary-card-label"><ClockIcon /> Graduation</div>
                        <div className="summary-card-value" style={{ fontSize:15 }}>{result.estimatedGraduationTerm}</div>
                      </div>
                      <div className="summary-card" style={{ borderTop: "3px solid var(--ua-sage)" }}>
                        <div className="summary-card-label"><BookIcon /> Remaining</div>
                        <div className="summary-card-value">{result.remainingUnits} <span style={{ fontSize:12, fontFamily:"'DM Sans',sans-serif", fontWeight:400, color:"#9ca3af" }}>units</span></div>
                      </div>
                    </div>
                    <div className="risk-box">
                      <div className="risk-title"><WarnIcon /> Risk Flags</div>
                      {result.riskFlags.map((f, i) => (
                        <div key={i} className="risk-item"><div className="risk-dot" />{f}</div>
                      ))}
                    </div>
                  </div>

                  <div className="divider" />

                  {/* ── Export ── */}
                  <div className="export-row">
                    <button className="btn-secondary" onClick={() => { exportCSV(result); showToast("CSV exported!", "Your degree plan downloaded.", "success"); }}>
                      <DownloadIcon /> Export CSV
                    </button>
                    <button className="btn-secondary btn-copper" onClick={() => showToast("PDF export coming soon", "This feature is in development.", "info")}>
                      <FileIcon /> Export PDF
                    </button>
                  </div>

                  <div className="divider" />

                  {/* ── Semester Plan ── */}
                  <div>
                    <div className="section-header">Semester Plan</div>
                    <div className="sem-grid">
                      {result.semesters.map((sem, i) => {
                        const season = sem.term.includes("Fall") ? "fall" : sem.term.includes("Spring") ? "spring" : "summer";
                        return (
                          <div key={i} className={`sem-card sem-${season}`}>
                            <div className="sem-header">
                              <div className="sem-header-left">
                                <span className={`sem-season-badge badge-${season}`}>{season}</span>
                                <span className="sem-term">{sem.term}</span>
                              </div>
                              <span className="sem-units">{sem.totalUnits} units</span>
                            </div>
                            <div className="sem-courses">
                              {sem.courses.map((c, j) => (
                                <div key={j} className="course-row">
                                  <div className="course-left">
                                    <div style={{ display:"flex", gap:8, alignItems:"baseline" }}>
                                      <span className="course-code">{c.code}</span>
                                      <span className="course-title">{c.title}</span>
                                    </div>
                                    {c.warnings.map((w, k) => (
                                      <div key={k} className="course-warn">⚠ {w}</div>
                                    ))}
                                  </div>
                                  <span className="course-units">{c.units}u</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="divider" />

                  {/* ── Next Term Recommendations ── */}
                  <div>
                    <div className="section-header">
                      Next Term Picks
                      <span className="rec-term-badge">Fall 2025</span>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Course</th>
                            <th style={{ textAlign:"center" }}>§</th>
                            <th>Modality</th>
                            <th style={{ textAlign:"right" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.recommendations.map((r, i) => {
                            const mc = r.modality.includes("Online") ? "modality-online" : r.modality.includes("Hybrid") ? "modality-hybrid" : "modality-ip";
                            return (
                              <tr key={i}>
                                <td>
                                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, fontWeight:700, color:"var(--ua-blue)" }}>{r.code}</div>
                                  <div style={{ fontSize:11, color:"#6b7280", marginTop:1 }}>{r.title}</div>
                                </td>
                                <td style={{ textAlign:"center" }}>
                                  <span style={{ background:"#f1f5f9", padding:"2px 7px", borderRadius:5, fontSize:11, fontWeight:700 }}>{r.sections}</span>
                                </td>
                                <td><span className={mc} style={{ fontSize:11 }}>{r.modality}</span></td>
                                <td style={{ textAlign:"right" }}>
                                  <button className="btn-faculty" onClick={() => setModalCourse(r)}>
                                    👤 Faculty
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="divider" />

                  {/* ── Requirements ── */}
                  <div>
                    <div className="section-header">
                      Requirements Checklist
                      <span style={{ fontSize:10, fontWeight:700, color:"#9ca3af" }}>{satisfiedCount} / {totalReqs}</span>
                    </div>
                    <div className="req-progress-wrap">
                      <div className="req-progress-bar">
                        <div className="req-progress-fill" style={{ width: `${(satisfiedCount / totalReqs) * 100}%` }} />
                      </div>
                      <div className="req-progress-label">
                        <span>{satisfiedCount} satisfied</span><span>{totalReqs - satisfiedCount} remaining</span>
                      </div>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Requirement</th>
                            <th style={{ textAlign:"center" }}>Status</th>
                            <th style={{ textAlign:"right" }}>Catalog</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.requirements.map((req, i) => (
                            <tr key={i}>
                              <td style={{ fontSize:12 }}>{req.name}</td>
                              <td style={{ textAlign:"center" }}>
                                {req.status === "Satisfied" ? (
                                  <span className="status-satisfied">✓ Done</span>
                                ) : (
                                  <span className="status-remaining">○ Pending</span>
                                )}
                              </td>
                              <td style={{ textAlign:"right" }}>
                                <a href={req.url} target="_blank" rel="noopener noreferrer" className="req-link">
                                  Link ↗
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p style={{ fontSize:11, color:"#9ca3af", textAlign:"center", paddingBottom:8 }}>
                    For advising reference only. Confirm with your{" "}
                    <a href="https://advising.arizona.edu" target="_blank" rel="noopener noreferrer" style={{ color:"var(--ua-sky)" }}>UA academic advisor</a>.
                  </p>
                </div>
              ) : (
                <div className="panel-empty">
                  <div className="empty-inner">
                    <div className="empty-icon">
                      🎓
                      <div className="empty-icon-badge">+2</div>
                    </div>
                    <div className="empty-title">Ready to plan?</div>
                    <p className="empty-desc">
                      Fill in your profile and paste your transcript, then hit <strong>Generate Plan</strong> to see your personalized Math second-major roadmap.
                    </p>
                    <p className="empty-arrow">← Configure your profile on the left</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Instructor Modal ── */}
        {modalCourse && (
          <div className="modal-overlay" onClick={() => setModalCourse(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">{modalCourse.code} Instructors</div>
                  <div className="modal-subtitle">{modalCourse.title}</div>
                </div>
                <button className="modal-close" onClick={() => setModalCourse(null)}>✕</button>
              </div>
              <div className="modal-body">
                {modalCourse.instructors.map((inst, i) => {
                  const lastName = inst.split(" ").pop();
                  const initials = lastName?.[0] || "?";
                  return (
                    <div key={i} className="instructor-row">
                      <div className="instructor-avatar">{initials}</div>
                      <div>
                        <div className="instructor-name">{inst}</div>
                        <div className="instructor-rmp">
                          <a href={`https://www.ratemyprofessors.com/search/professors/1003?q=${encodeURIComponent(lastName || "")}`} target="_blank" rel="noopener noreferrer">
                            View on RateMyProfessors →
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="modal-footer">
                Register at <a href="https://uaccess.arizona.edu" target="_blank" rel="noopener noreferrer">UAccess ↗</a>
              </div>
            </div>
          </div>
        )}

        {/* ── Toast ── */}
        {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      </div>
    </>
  );
}
