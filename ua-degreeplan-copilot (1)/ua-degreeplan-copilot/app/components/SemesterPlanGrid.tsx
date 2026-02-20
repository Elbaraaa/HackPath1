"use client";
import { useAppStore } from "@/lib/store";
import { AlertCircle, BookOpen } from "lucide-react";

const TERM_COLORS: Record<string, { bg: string; accent: string; badge: string }> = {
  Fall: { bg: "bg-ua-blue/5", accent: "border-l-ua-blue", badge: "bg-ua-blue text-white" },
  Spring: { bg: "bg-ua-sage/5", accent: "border-l-ua-sage", badge: "bg-ua-sage text-white" },
  Summer: { bg: "bg-ua-copper/5", accent: "border-l-ua-copper", badge: "bg-ua-copper text-white" },
};

function getTermSeason(term: string) {
  if (term.includes("Fall")) return "Fall";
  if (term.includes("Spring")) return "Spring";
  return "Summer";
}

export function SemesterPlanGrid() {
  const { result } = useAppStore();
  if (!result) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
        Semester Plan
      </h3>
      <div className="grid gap-3">
        {result.semesters.map((sem, i) => {
          const season = getTermSeason(sem.term);
          const colors = TERM_COLORS[season];
          return (
            <div
              key={sem.term}
              className={`rounded-xl border-l-4 ${colors.accent} ${colors.bg} border border-slate-200/80 overflow-hidden`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/60">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${colors.badge}`}>
                    {season}
                  </span>
                  <span className="font-semibold text-slate-800 text-sm">{sem.term}</span>
                </div>
                <span className="text-xs font-semibold text-slate-500 tabular-nums">
                  {sem.totalUnits} units
                </span>
              </div>

              {/* Courses */}
              <div className="px-4 py-2.5 space-y-1.5">
                {sem.courses.map((course, j) => (
                  <div key={j} className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-700 font-mono">{course.code}</span>
                        <span className="text-xs text-slate-500 truncate">{course.title}</span>
                      </div>
                      {course.warnings.map((w, k) => (
                        <div key={k} className="flex items-center gap-1 mt-0.5">
                          <AlertCircle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                          <span className="text-xs text-amber-600">{w}</span>
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-slate-400 font-mono flex-shrink-0">{course.units}u</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
