"use client";
import { useAppStore } from "@/lib/store";
import { AlertTriangle, CheckCircle2, Clock, TrendingUp, BookOpen } from "lucide-react";

export function SummaryBar() {
  const { result } = useAppStore();
  if (!result) return null;

  const feasibilityConfig = {
    High: { bg: "bg-emerald-500", text: "text-emerald-700", ring: "ring-emerald-200", label: "High Feasibility" },
    Medium: { bg: "bg-amber-500", text: "text-amber-700", ring: "ring-amber-200", label: "Medium Feasibility" },
    Low: { bg: "bg-rose-500", text: "text-rose-700", ring: "ring-rose-200", label: "Low Feasibility" },
  }[result.feasibility];

  return (
    <div className="animate-fade-in">
      {/* Main metrics row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className={`rounded-xl bg-white border p-4 flex flex-col gap-1 ring-2 ${feasibilityConfig.ring}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className={`h-2.5 w-2.5 rounded-full ${feasibilityConfig.bg}`} />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Feasibility</span>
          </div>
          <p className={`text-lg font-bold font-display ${feasibilityConfig.text}`}>{result.feasibility}</p>
        </div>

        <div className="rounded-xl bg-white border p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-3.5 w-3.5 text-ua-blue/60" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Graduation</span>
          </div>
          <p className="text-base font-bold font-display text-ua-blue leading-tight">{result.estimatedGraduationTerm}</p>
        </div>

        <div className="rounded-xl bg-white border p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-3.5 w-3.5 text-ua-copper/70" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Remaining</span>
          </div>
          <p className="text-lg font-bold font-display text-ua-copper">{result.remainingUnits} <span className="text-sm font-normal text-slate-500">units</span></p>
        </div>
      </div>

      {/* Risk flags */}
      {result.riskFlags.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-bold uppercase tracking-wide text-amber-700">Risk Flags</span>
          </div>
          <ul className="space-y-1.5">
            {result.riskFlags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
