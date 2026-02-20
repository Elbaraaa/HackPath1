"use client";
import { useAppStore } from "@/lib/store";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";

export function RequirementsChecklist() {
  const { result } = useAppStore();
  if (!result) return null;

  const satisfied = result.requirements.filter((r) => r.status === "Satisfied");
  const remaining = result.requirements.filter((r) => r.status === "Remaining");

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
          Requirements
        </h3>
        <span className="text-xs text-slate-400">
          {satisfied.length} / {result.requirements.length} satisfied
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-ua-sage to-emerald-500 transition-all duration-500"
          style={{ width: `${(satisfied.length / result.requirements.length) * 100}%` }}
        />
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Requirement</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Link</th>
            </tr>
          </thead>
          <tbody>
            {result.requirements.map((req, i) => (
              <tr
                key={i}
                className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
              >
                <td className="px-4 py-2.5 text-xs text-slate-700 font-medium">{req.name}</td>
                <td className="px-3 py-2.5 text-center">
                  {req.status === "Satisfied" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Done
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                      <Circle className="h-3.5 w-3.5" />
                      Pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <a
                    href={req.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-ua-sky hover:text-ua-blue hover:underline transition-colors"
                  >
                    Catalog
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
