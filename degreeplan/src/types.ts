export interface Course {
  id?: number;
  code: string;
  title: string;
  units: number;
  category: string;
  major: string;
  description: string;
  syllabus: string;
  prereqs: string[];
  offered: string[];
}

export interface PlanResult {
  feasibility: string;
  estimatedGraduationTerm: string;
  remainingUnits: number;
  completionMessage?: string;
  completedCourses: string[];
  riskFlags: string[];
  semesters: {
    term: string;
    totalUnits: number;
    minimumUnits?: number;
    difficultyScore?: number;
    difficultyLabel?: string;
    computerScienceCourses?: number;
    warnings?: string[];
    courses: {
      code: string;
      title: string;
      units: number;
      warnings: string[];
      kind?: 'course' | 'elective_choice' | 'policy_placeholder';
      requirement?: string;
      requirementTitle?: string;
      options?: string[];
    }[];
  }[];
  requirements: { name: string; status: string; url: string }[];
  recommendations: {
    code: string;
    title: string;
    sections: number;
    modality: string;
    instructors: string[];
    kind?: 'course' | 'elective_choice' | 'policy_placeholder';
    requirement?: string;
    requirementTitle?: string;
    options?: string[];
  }[];
  profile?: {
    studentName?: string;
    studentEmail?: string;
    studentId?: string;
    studentType: 'domestic' | 'international';
    primaryMajor: string;
    secondMajor?: string;
    standing: string;
    targetGraduation: string;
    maxUnits: number;
    minimumUnits: number;
    includeSummer: boolean;
    finalTermApproval: boolean;
    snapshotMajor: string;
  };
}

export interface ToastMsg {
  title: string;
  desc?: string;
  type: 'success' | 'error' | 'info';
}

export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}
