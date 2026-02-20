"use client";
import { GraduationCap, ArrowLeft } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
      <div className="relative">
        <div className="h-20 w-20 rounded-2xl bg-ua-blue/10 flex items-center justify-center">
          <GraduationCap className="h-10 w-10 text-ua-blue/60" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-ua-red flex items-center justify-center">
          <span className="text-white text-xs font-bold">+2</span>
        </div>
      </div>
      <div className="space-y-2 max-w-xs">
        <h3 className="font-display text-xl font-bold text-ua-blue">
          Ready to plan?
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          Fill in your profile and paste your transcript, then hit{" "}
          <strong className="text-ua-blue">Generate Plan</strong> to see your personalized Math second-major roadmap.
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <ArrowLeft className="h-3 w-3" />
        <span>Configure your profile on the left</span>
      </div>
    </div>
  );
}
