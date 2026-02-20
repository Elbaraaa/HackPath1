export const MOCK_PLAN_RESULT = {
  feasibility: "High" as const,
  estimatedGraduationTerm: "Spring 2027",
  remainingUnits: 42,
  riskFlags: [
    "Prereq chain tight for MATH 413",
    "Summer enrollment recommended for smooth graduation",
    "MATH 355 only offered Fall semesters — plan accordingly",
  ],
  semesters: [
    {
      term: "Fall 2025",
      totalUnits: 16,
      courses: [
        { code: "MATH 313", title: "Introduction to Proofs", units: 3, warnings: [] },
        { code: "MATH 323", title: "Real Analysis I", units: 3, warnings: ["Prereq: MATH 254 required"] },
        { code: "CSC 335", title: "Object-Oriented Programming & Design", units: 3, warnings: [] },
        { code: "CSC 345", title: "Analysis of Discrete Structures", units: 3, warnings: [] },
        { code: "ENGL 308", title: "Technical Writing", units: 3, warnings: [] },
        { code: "GEN ED", title: "Traditions & Cultures Elective", units: 3, warnings: [] },
      ],
    },
    {
      term: "Spring 2026",
      totalUnits: 15,
      courses: [
        { code: "MATH 324", title: "Real Analysis II", units: 3, warnings: ["Prereq pending: MATH 323"] },
        { code: "MATH 355", title: "Linear Algebra", units: 3, warnings: ["Rarely offered — only Fall"] },
        { code: "CSC 422", title: "Parallel & Distributed Programming", units: 3, warnings: [] },
        { code: "CSC 460", title: "Database Design", units: 3, warnings: [] },
        { code: "MATH ELEC", title: "Mathematics Elective (upper div)", units: 3, warnings: [] },
      ],
    },
    {
      term: "Summer 2026",
      totalUnits: 6,
      courses: [
        { code: "MATH 413", title: "Abstract Algebra I", units: 3, warnings: ["High workload — summer recommended"] },
        { code: "MATH ELEC", title: "Applied Mathematics Elective", units: 3, warnings: [] },
      ],
    },
    {
      term: "Fall 2026",
      totalUnits: 16,
      courses: [
        { code: "MATH 414", title: "Abstract Algebra II", units: 3, warnings: ["Prereq pending: MATH 413"] },
        { code: "MATH 425", title: "Complex Variables", units: 3, warnings: [] },
        { code: "CSC 483", title: "Introduction to Natural Language Processing", units: 3, warnings: [] },
        { code: "CSC ELEC", title: "CS Upper Division Elective", units: 3, warnings: [] },
        { code: "INDV ELEC", title: "Individuals & Societies Elective", units: 3, warnings: [] },
      ],
    },
    {
      term: "Spring 2027",
      totalUnits: 5,
      courses: [
        { code: "CSC 498", title: "Senior Capstone Project", units: 3, warnings: [] },
        { code: "MATH ELEC", title: "Mathematics Upper Division Elective", units: 2, warnings: [] },
      ],
    },
  ],
  requirements: [
    {
      name: "MATH 122A/B — Calculus I",
      status: "Satisfied" as const,
      evidenceUrl: "https://catalog.arizona.edu/coursedescription/MATH/122B",
    },
    {
      name: "MATH 129 — Calculus II",
      status: "Satisfied" as const,
      evidenceUrl: "https://catalog.arizona.edu/coursedescription/MATH/129",
    },
    {
      name: "MATH 223 — Vector Calculus",
      status: "Satisfied" as const,
      evidenceUrl: "https://catalog.arizona.edu/coursedescription/MATH/223",
    },
    {
      name: "MATH 254 — Introduction to ODE",
      status: "Satisfied" as const,
      evidenceUrl: "https://catalog.arizona.edu/coursedescription/MATH/254",
    },
    {
      name: "MATH 313 — Introduction to Proofs",
      status: "Remaining" as const,
      evidenceUrl: "https://catalog.arizona.edu/coursedescription/MATH/313",
    },
    {
      name: "MATH 323/324 — Real Analysis I & II",
      status: "Remaining" as const,
      evidenceUrl: "https://catalog.arizona.edu/coursedescription/MATH/323",
    },
    {
      name: "MATH 355 — Linear Algebra",
      status: "Remaining" as const,
      evidenceUrl: "https://catalog.arizona.edu/coursedescription/MATH/355",
    },
    {
      name: "MATH 413/414 — Abstract Algebra I & II",
      status: "Remaining" as const,
      evidenceUrl: "https://catalog.arizona.edu/coursedescription/MATH/413",
    },
    {
      name: "3 Upper Division Math Electives",
      status: "Remaining" as const,
      evidenceUrl: "https://math.arizona.edu/undergraduate/degrees",
    },
    {
      name: "Mathematics BA/BS Declaration",
      status: "Remaining" as const,
      evidenceUrl: "https://math.arizona.edu/advising",
    },
  ],
  recommendations: [
    {
      term: "Fall 2025",
      items: [
        {
          code: "MATH 313",
          title: "Introduction to Proofs",
          sections: 4,
          modality: "In Person",
          instructors: ["Dr. Karolina Alexopoulos", "Dr. Marcus Webb", "Dr. Priya Sundaresan"],
        },
        {
          code: "MATH 323",
          title: "Real Analysis I",
          sections: 3,
          modality: "In Person",
          instructors: ["Dr. Jana Horáková", "Dr. Thomas Fenn"],
        },
        {
          code: "MATH 355",
          title: "Linear Algebra",
          sections: 2,
          modality: "Hybrid",
          instructors: ["Dr. Samuel Okonkwo", "Dr. Lena Fischer"],
        },
        {
          code: "MATH 413",
          title: "Abstract Algebra I",
          sections: 2,
          modality: "In Person",
          instructors: ["Dr. Ricardo Morales"],
        },
        {
          code: "MATH 425",
          title: "Complex Variables",
          sections: 1,
          modality: "In Person",
          instructors: ["Dr. Weilin Zhang"],
        },
        {
          code: "MATH 464",
          title: "Theory of Probability",
          sections: 2,
          modality: "In Person / Online",
          instructors: ["Dr. Elena Vasquez", "Dr. Kofi Asante"],
        },
      ],
    },
  ],
};

export const SAMPLE_TRANSCRIPT = `UNIVERSITY OF ARIZONA
UNOFFICIAL TRANSCRIPT

Student: Jane Doe
Student ID: 123456789
Major: Computer Science (BS)
Classification: Junior
GPA: 3.72

COMPLETED COURSEWORK
-------------------------------------------
Fall 2023
CSC 110  Intro to Computer Programming        3  A
MATH 122B Calculus I                          4  A-
ENGL 101 First Year Composition               3  B+
INDV 101  Individuals & Societies             3  A

Spring 2024
CSC 120  Intro to Computer Programming II     3  A
MATH 129  Calculus II                         4  B+
MATH 196L Calculus Problem Solving Lab        1  P
PHYS 141  Introductory Mechanics              4  B

Fall 2024
CSC 210  Software Development                 3  A
CSC 245  Object-Oriented Programming I        3  A-
MATH 223  Vector Calculus III                 4  A
PHYS 241  Intro to E&M                        4  B+

Spring 2025
CSC 252  Intro to Computer Organization      3  B+
CSC 335  OO Programming & Design             3  A
MATH 254  Intro to Ordinary Diff Eqs         3  A
TRAD 104  Traditions & Cultures              3  B+

TRANSFER CREDIT
-------------------------------------------
AP Calculus AB  (MATH 122A equivalent)        4  CR
AP Statistics   (MATH 163 equivalent)         3  CR

TOTAL COMPLETED UNITS: 62
`;
