import { create } from "zustand";

export interface StudentProfile {
  standing: string;
  major: string;
  secondMajor: string;
  graduationTerm: string;
  maxUnitsPerSem: number;
  summerAllowed: boolean;
}

export interface Course {
  code: string;
  title: string;
  units: number;
  warnings: string[];
}

export interface Semester {
  term: string;
  totalUnits: number;
  courses: Course[];
}

export interface Requirement {
  name: string;
  status: "Satisfied" | "Remaining";
  evidenceUrl: string;
}

export interface RecommendationItem {
  code: string;
  title: string;
  sections: number;
  modality: string;
  instructors: string[];
}

export interface Recommendation {
  term: string;
  items: RecommendationItem[];
}

export interface PlanResult {
  feasibility: "High" | "Medium" | "Low";
  estimatedGraduationTerm: string;
  remainingUnits: number;
  riskFlags: string[];
  semesters: Semester[];
  requirements: Requirement[];
  recommendations: Recommendation[];
}

interface AppState {
  profile: StudentProfile;
  transcriptText: string;
  result: PlanResult | null;
  isLoading: boolean;
  error: string | null;
  isDemoMode: boolean;

  setProfile: (profile: Partial<StudentProfile>) => void;
  setTranscriptText: (text: string) => void;
  setResult: (result: PlanResult | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setDemoMode: (demo: boolean) => void;
  reset: () => void;
}

const DEFAULT_PROFILE: StudentProfile = {
  standing: "Junior",
  major: "Computer Science (BS)",
  secondMajor: "Mathematics (BA)",
  graduationTerm: "Spring 2027",
  maxUnitsPerSem: 16,
  summerAllowed: false,
};

export const useAppStore = create<AppState>((set) => ({
  profile: DEFAULT_PROFILE,
  transcriptText: "",
  result: null,
  isLoading: false,
  error: null,
  isDemoMode: true,

  setProfile: (partial) =>
    set((state) => ({ profile: { ...state.profile, ...partial } })),
  setTranscriptText: (text) => set({ transcriptText: text }),
  setResult: (result) => set({ result }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setDemoMode: (isDemoMode) => set({ isDemoMode }),
  reset: () =>
    set({
      profile: DEFAULT_PROFILE,
      transcriptText: "",
      result: null,
      isLoading: false,
      error: null,
    }),
}));
