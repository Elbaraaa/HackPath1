import { PlanResult } from '@/types';

export function exportCSV(r: PlanResult) {
  const rows = [
    ['UA DegreePlan Export'],
    ['Feasibility', r.feasibility],
    ['Graduation', r.estimatedGraduationTerm],
    ['Remaining Units', r.remainingUnits],
    [],
    ['SEMESTER PLAN'],
    ['Term', 'Term Units', 'Difficulty', 'CS-heavy Courses', 'Code', 'Title', 'Units', 'Warnings'],
    ...r.semesters.flatMap(s =>
      s.courses.map(c => [
        s.term,
        s.totalUnits,
        s.difficultyScore ? `${s.difficultyScore} ${s.difficultyLabel || ''}`.trim() : '',
        s.computerScienceCourses ?? '',
        c.code,
        c.title,
        c.units,
        [...(s.warnings || []), ...(c.warnings || [])].join('; ')
      ])
    ),
    [],
    ['REQUIREMENTS'],
    ['Requirement', 'Status'],
    ...r.requirements.map(x => [x.name, x.status]),
  ];
  const csv = rows
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'degreeplan.csv';
  a.click();
}
