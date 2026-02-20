"use client";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Users, Monitor, MapPin, Layers } from "lucide-react";

export function NextTermRecommendations() {
  const { result } = useAppStore();
  const [selectedCourse, setSelectedCourse] = useState<{
    code: string;
    title: string;
    instructors: string[];
  } | null>(null);

  if (!result || result.recommendations.length === 0) return null;

  const rec = result.recommendations[0];

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
          Next Term Picks
        </h3>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-ua-blue/10 text-ua-blue">{rec.term}</span>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Course</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">§</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Modality</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide"></th>
            </tr>
          </thead>
          <tbody>
            {rec.items.map((item, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-bold text-xs font-mono text-ua-blue">{item.code}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{item.title}</div>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                    {item.sections}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                    {item.modality.includes("Online") ? (
                      <Monitor className="h-3 w-3 text-purple-500" />
                    ) : item.modality.includes("Hybrid") ? (
                      <Layers className="h-3 w-3 text-amber-500" />
                    ) : (
                      <MapPin className="h-3 w-3 text-ua-sage" />
                    )}
                    {item.modality}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-ua-blue hover:bg-ua-blue/5"
                    onClick={() => setSelectedCourse({ code: item.code, title: item.title, instructors: item.instructors })}
                  >
                    <Users className="h-3 w-3" />
                    Faculty
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-ua-blue">
              {selectedCourse?.code} Instructors
            </DialogTitle>
            <DialogDescription>{selectedCourse?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {selectedCourse?.instructors.map((inst, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-ua-warmgray/60"
              >
                <div className="h-8 w-8 rounded-full bg-ua-blue/10 flex items-center justify-center text-ua-blue font-bold text-sm">
                  {inst.split(" ").pop()?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{inst}</p>
                  <p className="text-xs text-slate-400">
                    <a
                      href={`https://ratemyprofessors.com/search/professors/1003?q=${encodeURIComponent(inst.split(". ").pop() || inst)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ua-sky hover:underline"
                    >
                      View on RateMyProfessors →
                    </a>
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 text-center pt-2">
            Register at{" "}
            <a href="https://uaccess.arizona.edu" target="_blank" rel="noopener noreferrer" className="text-ua-sky hover:underline">
              UAccess
            </a>
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
