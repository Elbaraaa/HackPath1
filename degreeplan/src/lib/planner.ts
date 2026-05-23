import { PlanResult } from '@/types';
import { getDb } from './db';

type Row = Record<string, any>;
type StudentType = 'domestic' | 'international';

function parseJson<T>(value: unknown, fallback: T): T {
  try {
    return typeof value === 'string' && value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function queryAll(db: any, sql: string, params?: Record<string, any>): Row[] {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const rows: Row[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(db: any, sql: string, params?: Record<string, any>): Row | null {
  const rows = queryAll(db, sql, params);
  return rows[0] ?? null;
}

function cleanOptions(options: unknown[]): string[] {
  return options
    .filter((opt): opt is string => typeof opt === 'string')
    .map(opt => opt.trim())
    .filter(opt =>
      opt &&
      opt !== 'Approved Transfer Course' &&
      opt !== 'Approved Transfer Coursework'
    )
    .map(opt => opt === '473' ? 'CSC 473' : opt);
}

function courseSubjectRank(code: string) {
  if (code.startsWith('CSC ')) return 0;
  if (code.startsWith('MATH ')) return 1;
  if (code.startsWith('GEOS ')) return 2;
  if (code.startsWith('PHYS ')) return 3;
  if (code.startsWith('CHEM ')) return 4;
  if (code.startsWith('MCB ') || code.startsWith('ECOL ')) return 5;
  return 6;
}

function sortOptions(options: string[]) {
  return [...options].sort((a, b) => {
    const rank = courseSubjectRank(a) - courseSubjectRank(b);
    return rank || a.localeCompare(b);
  });
}

function getCourseInfo(db: any, code: string) {
  const row = queryOne(
    db,
    `SELECT code, title, units FROM courses WHERE code = $code ORDER BY major LIMIT 1`,
    { $code: code }
  );

  return {
    code,
    title: String(row?.title || ''),
    units: Number(row?.units || 3)
  };
}

function parseCourseLevel(code: string) {
  const match = code.match(/\b[A-Z]{2,5}\s+(\d{3})[A-Z]?\b/);
  return match ? Number(match[1]) : 0;
}

function isComputerScienceCourse(course: any) {
  if (String(course.code || '').startsWith('CSC ')) return true;
  if (course.kind === 'elective_choice' && Array.isArray(course.options)) {
    return course.options.some((option: string) => option.startsWith('CSC '));
  }
  return false;
}

function isUpperDivision(course: any) {
  if (parseCourseLevel(String(course.code || '')) >= 300) return true;
  if (course.kind === 'elective_choice' && Array.isArray(course.options)) {
    return course.options.some((option: string) => parseCourseLevel(option) >= 300);
  }
  return false;
}

function coursePlanningPriority(course: any) {
  const code = String(course.code || '');
  const requirement = String(course.requirement || '');
  const requirementTitle = String(course.requirementTitle || course.title || '');
  const isCore = requirement === 'R1300/L50' || /\bcore\b/i.test(requirementTitle);

  if (code === 'CSC 352') return 0;
  if (code === 'CSC 380') return 1;
  if (isCore && course.kind !== 'elective_choice') return 2;
  if (course.kind === 'course' && code.startsWith('CSC ')) return 3;
  if (course.kind === 'course') return 4;
  if (course.kind === 'elective_choice') return 5;
  return 6;
}

function comparePlanningPriority(a: any, b: any) {
  const priority = coursePlanningPriority(a) - coursePlanningPriority(b);
  return priority ||
    Number(isUpperDivision(b)) - Number(isUpperDivision(a)) ||
    String(a.code).localeCompare(String(b.code));
}

function getSnapshotMajor(db: any, snapshotId: number) {
  const row = queryOne(
    db,
    `SELECT m.name
     FROM advisement_snapshots s
     LEFT JOIN majors m ON m.id = s.major_id
     WHERE s.id = $snapshotId`,
    { $snapshotId: snapshotId }
  );

  return String(row?.name || 'Imported Advisement Major');
}

function pickCourses(
  db: any,
  row: Row,
  takenCourses: Set<string>,
  usedCourses: Set<string>,
  countOverride?: number
) {
  const needed = Math.max(1, Number(countOverride ?? row.needed_value ?? 1));
  const options = sortOptions(cleanOptions(parseJson(row.available_options_json, [])));
  const picks = [];
  const requirementTitle = String(row.title || 'Requirement');

  if (/elective/i.test(requirementTitle) && options.length > 1) {
    for (let i = 0; i < needed; i += 1) {
      picks.push({
        code: 'Elective',
        title: requirementTitle,
        units: 3,
        requirement: row.code || row.requirement_code,
        requirementTitle,
        kind: 'elective_choice',
        options: options.slice(0, 12),
        warnings: ['Use the Interest Advisor to pick this course from your options']
      });
    }
    return picks;
  }

  for (const option of options) {
    if (picks.length >= needed) break;
    if (takenCourses.has(option) || usedCourses.has(option)) continue;

    const course = getCourseInfo(db, option);
    picks.push({
      code: course.code,
      title: course.title,
      units: course.units,
      requirement: row.code || row.requirement_code,
      requirementTitle,
      kind: 'course',
      warnings: course.title ? [] : ['Course details not found in catalog database']
    });
    usedCourses.add(option);
  }

  return picks;
}

function normalizeSeason(term: string) {
  if (/summer/i.test(term)) return 'Summer';
  if (/spring/i.test(term)) return 'Spring';
  return 'Fall';
}

function termValue(term: string) {
  const match = term.match(/\b(Spring|Summer|Fall)\s+(\d{4})\b/i);
  if (!match) return null;
  const seasonOrder: Record<string, number> = { Spring: 0, Summer: 1, Fall: 2 };
  const season = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
  return Number(match[2]) * 3 + seasonOrder[season];
}

function nextAcademicTerm(includeSummer: boolean, from = new Date()) {
  const year = from.getFullYear();
  const month = from.getMonth() + 1;

  if (month <= 4) return includeSummer ? `Summer ${year}` : `Fall ${year}`;
  if (month <= 7) return `Fall ${year}`;
  return `Spring ${year + 1}`;
}

function nextTermAfter(term: string, includeSummer: boolean) {
  const value = termValue(term);
  const year = value ? Math.floor(value / 3) : new Date().getFullYear();
  const season = normalizeSeason(term);

  if (includeSummer) {
    if (season === 'Spring') return `Summer ${year}`;
    if (season === 'Summer') return `Fall ${year}`;
    return `Spring ${year + 1}`;
  }

  if (season === 'Spring') return `Fall ${year}`;
  return `Spring ${year + 1}`;
}

function targetTerms(includeSummer: boolean, gradTerm?: string) {
  const terms = [nextAcademicTerm(includeSummer)];
  const target = termValue(gradTerm || '');

  while (target && termValue(terms[terms.length - 1])! < target) {
    terms.push(nextTermAfter(terms[terms.length - 1], includeSummer));
    if (terms.length > 18) break;
  }

  return terms;
}

function pickTermCount(courses: any[], availableTerms: number, maxUnits: number, hasGradTarget: boolean) {
  const totalUnits = courses.reduce((sum, course) => sum + Number(course.units || 0), 0);
  const csTermsNeeded = Math.ceil(courses.filter(isComputerScienceCourse).length / 3);
  const minimumTermsNeeded = Math.max(1, Math.ceil(totalUnits / maxUnits), csTermsNeeded);

  return hasGradTarget
    ? Math.max(minimumTermsNeeded, availableTerms)
    : minimumTermsNeeded;
}

function distributeTargets(totalUnits: number, termCount: number, maxUnits: number) {
  const targets = Array.from({ length: termCount }, () => 0);
  let remaining = totalUnits;

  for (let i = 0; i < termCount; i += 1) {
    if (remaining <= 0) break;
    const termsLeft = termCount - i;
    const ideal = Math.ceil(remaining / termsLeft);
    targets[i] = Math.min(maxUnits, Math.max(3, ideal));
    remaining -= Math.min(remaining, targets[i]);
  }

  return targets;
}

function termDifficulty(term: { totalUnits: number; courses: any[] }, maxUnits: number) {
  const csCount = term.courses.filter(isComputerScienceCourse).length;
  const upperCount = term.courses.filter(isUpperDivision).length;
  const electiveCount = term.courses.filter(course => course.kind === 'elective_choice').length;
  const unitPressure = (term.totalUnits / Math.max(1, maxUnits)) * 38;
  const score = Math.min(100, Math.round(unitPressure + csCount * 13 + upperCount * 5 + electiveCount * 2));

  const label =
    score >= 80 ? 'Very Heavy' :
    score >= 65 ? 'Heavy' :
    score >= 45 ? 'Moderate' :
    'Light';

  return { score, label, csCount };
}

function addCourseToTerm(term: any, course: any) {
  term.courses.push({
    code: course.code,
    title: course.title || course.requirementTitle,
    units: course.units,
    warnings: course.warnings,
    kind: course.kind || 'course',
    requirement: course.requirement,
    requirementTitle: course.requirementTitle,
    options: course.options
  });
  term.totalUnits += course.units;
}

function addMinimumLoadPlaceholder(term: any, units: number, minUnits: number) {
  addCourseToTerm(term, {
    code: 'ENROLL',
    title: 'Advisor-approved course to maintain minimum enrollment',
    units,
    requirement: 'PROFILE/POLICY',
    requirementTitle: 'Minimum Enrollment',
    kind: 'policy_placeholder',
    warnings: [`Placeholder: choose an advisor-approved class or enrollment option to reach ${minUnits} units.`]
  });
}

function fillMinimumLoads(terms: any[], options: {
  minUnits: number;
  maxUnits: number;
  finalTermApproval: boolean;
}) {
  terms.forEach((term, index) => {
    const isFinal = index === terms.length - 1;
    const belowMinimum = term.totalUnits < options.minUnits;
    if (!belowMinimum) return;
    if (isFinal && options.finalTermApproval) return;

    const needed = options.minUnits - term.totalUnits;
    const room = options.maxUnits - term.totalUnits;

    if (room <= 0) {
      term.warnings.push(`Cannot reach the ${options.minUnits}-unit minimum with the selected max load.`);
      return;
    }

    addMinimumLoadPlaceholder(term, Math.min(needed, room), options.minUnits);

    if (term.totalUnits < options.minUnits) {
      term.warnings.push(`Still below the ${options.minUnits}-unit minimum after filling available load.`);
    }
  });
}

function buildTerms(courses: any[], options: {
  maxUnits: number;
  includeSummer: boolean;
  gradTerm?: string;
  minUnits: number;
  finalTermApproval: boolean;
}) {
  const totalUnits = courses.reduce((sum, course) => sum + Number(course.units || 0), 0);
  const names = targetTerms(options.includeSummer, options.gradTerm);
  const desiredTermCount = pickTermCount(courses, names.length, options.maxUnits, Boolean(options.gradTerm));
  while (names.length < desiredTermCount) {
    names.push(nextTermAfter(names[names.length - 1], options.includeSummer));
  }

  const termNames = names.slice(0, desiredTermCount);
  const targets = distributeTargets(totalUnits, termNames.length, options.maxUnits);
  const terms = termNames.map(term => ({
    term,
    totalUnits: 0,
    minimumUnits: options.minUnits,
    courses: [] as any[],
    warnings: [] as string[]
  }));

  let termIndex = 0;

  const orderedCourses = [...courses].sort(comparePlanningPriority);

  for (const course of orderedCourses) {
    const csLike = isComputerScienceCourse(course);
    let placed = false;

    for (let i = termIndex; i < terms.length; i += 1) {
      const term = terms[i];
      const csCount = term.courses.filter(isComputerScienceCourse).length;
      const underTarget = term.totalUnits < targets[i] || i === terms.length - 1;
      const underMax = term.totalUnits + course.units <= options.maxUnits;
      const underCsCap = !csLike || csCount < 3;

      if (underMax && underCsCap && underTarget) {
        addCourseToTerm(term, course);
        placed = true;
        if (term.totalUnits >= targets[i] && i < terms.length - 1) termIndex = i + 1;
        break;
      }
    }

    if (!placed) {
      const last = terms[terms.length - 1];
      const nextTerm = nextTermAfter(last.term, options.includeSummer);
      terms.push({
        term: nextTerm,
        totalUnits: 0,
        minimumUnits: options.minUnits,
        courses: [],
        warnings: ['Extra term added to avoid overloading computer science courses or unit limits.']
      });
      addCourseToTerm(terms[terms.length - 1], course);
      termIndex = terms.length - 1;
    }
  }

  fillMinimumLoads(terms, {
    minUnits: options.minUnits,
    maxUnits: options.maxUnits,
    finalTermApproval: options.finalTermApproval
  });

  return terms.filter(term => term.courses.length).map((term, index, allTerms) => {
    const isFinal = index === allTerms.length - 1;
    const difficulty = termDifficulty(term, options.maxUnits);
    const belowMinimum = term.totalUnits < options.minUnits;
    const needsApproval = belowMinimum && (isFinal && options.finalTermApproval);
    const warnings = [...term.warnings];

    if (difficulty.csCount > 3) {
      warnings.push('More than 3 computer science courses in one term.');
    }
    if (belowMinimum && !needsApproval) {
      warnings.push(`Below the ${options.minUnits}-unit minimum for this student type.`);
    }
    if (needsApproval) {
      warnings.push(`Final term is below ${options.minUnits} units and needs approval.`);
    }

    return {
      ...term,
      warnings,
      difficultyScore: difficulty.score,
      difficultyLabel: difficulty.label,
      computerScienceCourses: difficulty.csCount
    };
  });
}

function minimumUnitsForStudent(type: StudentType) {
  return type === 'international' ? 12 : 9;
}

function normalizeStudentType(value?: string): StudentType {
  return value === 'international' ? 'international' : 'domestic';
}

function calculateFeasibility(semesters: any[], missesTarget: boolean) {
  if (missesTarget) return 'Low';
  if (semesters.some(term => term.warnings?.some((w: string) => /minimum|More than 3/.test(w)))) return 'Low';
  if (semesters.some(term => Number(term.difficultyScore || 0) >= 80)) return 'Medium';
  if (semesters.length <= 4) return 'High';
  if (semesters.length <= 6) return 'Medium';
  return 'Low';
}

function loadPolicyRiskText(studentType: StudentType, minUnits: number, finalTermApproval: boolean) {
  if (studentType === 'international') {
    return finalTermApproval
      ? `International minimum is ${minUnits} units; only the graduating final term may go below it with approval.`
      : `International students must stay at ${minUnits}+ units unless they are in an approved final graduating term.`;
  }

  return `Domestic minimum is ${minUnits} units per regular term.`;
}

export async function generateSnapshotPlan(options: {
  snapshotId?: number;
  maxUnits?: number;
  includeSummer?: boolean;
  gradTerm?: string;
  major?: string;
  secondMajor?: string;
  standing?: string;
  studentName?: string;
  studentEmail?: string;
  studentId?: string;
  studentType?: StudentType;
  finalTermApproval?: boolean;
}): Promise<PlanResult> {
  const snapshotId = Number(options.snapshotId || 0);
  if (!snapshotId) {
    throw new Error('An imported advisement report snapshot is required to generate a plan.');
  }
  const maxUnits = Number(options.maxUnits || 15);
  const includeSummer = Boolean(options.includeSummer);
  const standing = options.standing || 'Junior';
  const studentType = normalizeStudentType(options.studentType);
  const minimumUnits = minimumUnitsForStudent(studentType);
  const finalTermApproval = Boolean(options.finalTermApproval);
  const db = await getDb();
  const snapshotMajor = getSnapshotMajor(db, snapshotId);

  const attempts = queryAll(
    db,
    `SELECT course_code, title, term, grade, units, attempt_status
     FROM student_course_attempts
     WHERE snapshot_id = $snapshotId
     ORDER BY id`,
    { $snapshotId: snapshotId }
  );

  if (!attempts.length) {
    throw new Error(`No advisement snapshot found for snapshot ${snapshotId}`);
  }

  const takenCourses = new Set(
    attempts
      .filter(row => row.attempt_status === 'completed' || row.attempt_status === 'in_progress')
      .map(row => String(row.course_code))
  );

  const completedCourses = attempts
    .filter(row => row.attempt_status === 'completed')
    .map(row => String(row.course_code));

  const statuses = queryAll(
    db,
    `SELECT
       COALESCE(r.code, s.requirement_code) AS code,
       COALESCE(r.title, s.title) AS title,
       r.parent_id,
       parent.code AS parent_code,
       parent.title AS parent_title,
       parent_rule.rule_type AS parent_rule_type,
       parent_rule.required_count AS parent_required_count,
       rr.rule_type,
       s.status,
       s.metric_type,
       s.required_value,
       s.completed_value,
       s.needed_value,
       s.available_options_json
     FROM student_requirement_status s
     LEFT JOIN requirement_nodes r ON s.requirement_node_id = r.id
     LEFT JOIN requirement_nodes parent ON r.parent_id = parent.id
     LEFT JOIN requirement_rules rr ON rr.requirement_node_id = r.id
     LEFT JOIN requirement_rules parent_rule ON parent_rule.requirement_node_id = parent.id
     WHERE s.snapshot_id = $snapshotId
       AND COALESCE(r.code, s.requirement_code) IS NOT NULL
     ORDER BY COALESCE(r.code, s.requirement_code)`,
    { $snapshotId: snapshotId }
  );

  const remaining = statuses.filter(row => row.status === 'not_satisfied');
  const requirements = statuses
    .filter(row => row.rule_type !== 'complete_all_children' && row.metric_type)
    .map(row => ({
      name: row.title || row.code,
      status: row.status === 'satisfied' ? 'Satisfied' : 'Pending',
      url: `https://catalog.arizona.edu`
    }));
  const allTrackedRequirementsSatisfied =
    requirements.length > 0 && requirements.every(requirement => requirement.status === 'Satisfied');
  const usedCourses = new Set<string>();
  const plannedCourses: any[] = [];
  const chooseGroups = new Map<string, Row[]>();

  if (allTrackedRequirementsSatisfied && remaining.length === 0) {
    return {
      feasibility: 'High',
      estimatedGraduationTerm: 'Requirements Complete',
      remainingUnits: 0,
      completionMessage: 'Congratulations, you have completed all the requirements.',
      completedCourses,
      riskFlags: [],
      semesters: [],
      requirements,
      recommendations: [],
      profile: {
        studentName: options.studentName || undefined,
        studentEmail: options.studentEmail || undefined,
        studentId: options.studentId || undefined,
        studentType,
        primaryMajor: options.major || snapshotMajor,
        secondMajor: options.secondMajor || undefined,
        standing,
        targetGraduation: 'Requirements Complete',
        maxUnits,
        minimumUnits,
        includeSummer,
        finalTermApproval,
        snapshotMajor
      }
    };
  }

  for (const row of remaining) {
    if (row.parent_rule_type === 'choose_n_children' && row.parent_code) {
      const rows = chooseGroups.get(row.parent_code) || [];
      rows.push(row);
      chooseGroups.set(row.parent_code, rows);
      continue;
    }

    if (row.metric_type === 'courses' && Number(row.needed_value || 0) > 0) {
      plannedCourses.push(...pickCourses(db, row, takenCourses, usedCourses));
    }
  }

  for (const [parentCode, rows] of chooseGroups) {
    const parent = rows[0];
    const satisfiedChildren = statuses.filter(
      row => row.parent_code === parentCode && row.status === 'satisfied'
    ).length;
    const requiredCount = Number(parent.parent_required_count || 1);
    let childrenNeeded = Math.max(0, requiredCount - satisfiedChildren);
    const candidateRows = [...rows].sort((a, b) => {
      if (a.metric_type === 'courses' && b.metric_type !== 'courses') return -1;
      if (a.metric_type !== 'courses' && b.metric_type === 'courses') return 1;
      return String(a.code).localeCompare(String(b.code));
    });

    for (const row of candidateRows) {
      if (childrenNeeded <= 0) break;
      const picks = pickCourses(db, row, takenCourses, usedCourses, 1);
      if (!picks.length) continue;
      plannedCourses.push(...picks);
      childrenNeeded -= 1;
    }
  }

  const semesters = buildTerms(plannedCourses, {
    maxUnits,
    includeSummer,
    gradTerm: options.gradTerm,
    minUnits: minimumUnits,
    finalTermApproval
  });
  const remainingUnitRows = remaining.filter(row => row.metric_type === 'units');
  const remainingUnits = Math.max(
    plannedCourses.reduce((sum, course) => sum + Number(course.units || 0), 0),
    ...remainingUnitRows
      .filter(row => row.parent_rule_type !== 'choose_n_children')
      .map(row => Math.max(0, Number(row.needed_value || 0)))
  );

  const riskFlags = [];
  if (remainingUnitRows.some(row => row.code === 'R1511/L30')) {
    riskFlags.push('Major unit totals still need advisor validation after planned courses are applied.');
  }
  if (remaining.some(row => row.parent_rule_type === 'choose_n_children')) {
    riskFlags.push('Supporting science is a choose-from group; confirm the selected science path with an advisor.');
  }
  riskFlags.push(loadPolicyRiskText(studentType, minimumUnits, finalTermApproval));
  if (options.major && options.major !== snapshotMajor) {
    riskFlags.push(`Primary major is set to ${options.major}, but the imported advisement snapshot is for ${snapshotMajor}.`);
  }
  if (options.secondMajor) {
    riskFlags.push(`${options.secondMajor} was added from the profile. Upload an advisement report that includes it for official requirement tracking.`);
  }
  if (maxUnits < 15) {
    riskFlags.push(`Max load is set to ${maxUnits} units, so the plan may need extra terms.`);
  }
  if (maxUnits > 18) {
    riskFlags.push(`Max load is set to ${maxUnits} units. Confirm overload policy and workload with an advisor.`);
  }
  if (standing === 'Senior' && semesters.length > 2) {
    riskFlags.push('Senior standing with more than two planned terms may need an advisor-reviewed graduation timeline.');
  }

  const lastTermValue = termValue(semesters[semesters.length - 1]?.term || '');
  const targetTermValue = termValue(options.gradTerm || '');
  const missesTarget = Boolean(lastTermValue && targetTermValue && lastTermValue > targetTermValue);
  if (missesTarget) {
    riskFlags.push(`This plan extends past the selected ${options.gradTerm} graduation target.`);
  }
  const recommendationCourses = [...plannedCourses].sort(comparePlanningPriority);

  return {
    feasibility: calculateFeasibility(semesters, missesTarget),
    estimatedGraduationTerm: options.gradTerm || 'Advisor Review Needed',
    remainingUnits,
    completedCourses,
    riskFlags,
    semesters,
    requirements,
    recommendations: recommendationCourses.slice(0, 6).map(course => ({
      code: course.code,
      title: course.title || course.requirementTitle,
      sections: 0,
      modality: course.kind === 'elective_choice' ? 'Use Interest Advisor' : 'Check UAccess',
      instructors: [],
      kind: course.kind || 'course',
      requirement: course.requirement,
      requirementTitle: course.requirementTitle,
      options: course.options
    })),
    profile: {
      studentName: options.studentName || undefined,
      studentEmail: options.studentEmail || undefined,
      studentId: options.studentId || undefined,
      studentType,
      primaryMajor: options.major || snapshotMajor,
      secondMajor: options.secondMajor || undefined,
      standing,
      targetGraduation: options.gradTerm || 'Advisor Review Needed',
      maxUnits,
      minimumUnits,
      includeSummer,
      finalTermApproval,
      snapshotMajor
    }
  };
}
