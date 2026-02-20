"use client";
import { useAppStore } from "@/lib/store";
import { MOCK_PLAN_RESULT } from "@/data/mockData";
import { StudentProfileCard } from "@/app/components/StudentProfileCard";
import { TranscriptInputCard } from "@/app/components/TranscriptInputCard";
import { SummaryBar } from "@/app/components/SummaryBar";
import { SemesterPlanGrid } from "@/app/components/SemesterPlanGrid";
import { RequirementsChecklist } from "@/app/components/RequirementsChecklist";
import { NextTermRecommendations } from "@/app/components/NextTermRecommendations";
import { ExportButtons } from "@/app/components/ExportButtons";
import { LoadingState } from "@/app/components/LoadingState";
import { EmptyState } from "@/app/components/EmptyState";
import { Button } from "@/app/components/ui/button";
import { toast } from "@/lib/use-toast";
import {
  Sparkles,
  RotateCcw,
  FlaskConical,
  Wifi,
  WifiOff,
  BookOpen,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  const {
    profile,
    transcriptText,
    result,
    isLoading,
    error,
    isDemoMode,
    setResult,
    setLoading,
    setError,
    setDemoMode,
    reset,
  } = useAppStore();

  const handleGenerate = async () => {
    if (!transcriptText.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (isDemoMode) {
        // Mock mode: simulate delay
        await new Promise((r) => setTimeout(r, 1200));
        setResult({
          ...MOCK_PLAN_RESULT,
          estimatedGraduationTerm: profile.graduationTerm,
          semesters: profile.summerAllowed
            ? MOCK_PLAN_RESULT.semesters
            : MOCK_PLAN_RESULT.semesters.filter((s) => !s.term.includes("Summer")),
        });
        toast({ title: "Plan generated!", description: "Demo mode: using sample data." });
      } else {
        // Real API mode
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, transcriptText }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "API error");
        }
        const data = await res.json();
        setResult(data);
        toast({ title: "Plan generated!", description: "Your personalized plan is ready." });
      }
    } catch (err: any) {
      const msg = err.message || "Something went wrong. Please try again.";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-ua-blue/10 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* UA logo mark */}
            <div className="h-8 w-8 rounded-lg bg-ua-blue flex items-center justify-center flex-shrink-0">
              <span className="text-white font-display font-bold text-sm leading-none">UA</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-ua-blue text-base leading-none">
                DegreePlan Copilot
              </h1>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">University of Arizona</p>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                <FlaskConical className="h-2.5 w-2.5" />
                DEMO
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                <Sparkles className="h-2.5 w-2.5" />
                Gemini
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Demo/Live toggle */}
            <button
              onClick={() => {
                setDemoMode(!isDemoMode);
                toast({
                  title: isDemoMode ? "Live mode enabled" : "Demo mode enabled",
                  description: isDemoMode
                    ? "Will call /api/plan endpoint."
                    : "Using mock data for demos.",
                });
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                isDemoMode
                  ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {isDemoMode ? (
                <><WifiOff className="h-3 w-3" /> Mock</>
              ) : (
                <><Wifi className="h-3 w-3" /> Live</>
              )}
            </button>

            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              className="gap-1.5 text-slate-500 hover:text-ua-blue h-8 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main layout ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── LEFT COLUMN ── */}
          <div className="w-full lg:w-[340px] xl:w-[360px] flex-shrink-0 space-y-4">
            <StudentProfileCard />
            <TranscriptInputCard />

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={!transcriptText.trim() || isLoading}
              className="w-full h-11 bg-ua-blue hover:bg-ua-blue/90 text-white font-semibold gap-2 text-sm shadow-lg shadow-ua-blue/20 disabled:opacity-40 disabled:shadow-none transition-all"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Plan
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </>
              )}
            </Button>

            {/* Hint text */}
            {!transcriptText.trim() && (
              <p className="text-xs text-center text-slate-400 -mt-1">
                Load a sample transcript to try the demo
              </p>
            )}

            {/* Context badge */}
            <div className="rounded-xl border border-ua-desert bg-ua-warmgray/50 p-3 text-center">
              <p className="text-xs text-slate-500 leading-relaxed">
                <span className="font-semibold text-ua-blue">CS (BS)</span> → adding{" "}
                <span className="font-semibold text-ua-copper">Mathematics</span> second major<br />
                <a
                  href="https://math.arizona.edu/undergraduate/degrees"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ua-sky hover:underline inline-flex items-center gap-0.5 mt-0.5"
                >
                  <BookOpen className="h-2.5 w-2.5" />
                  UA Math degree requirements
                </a>
              </p>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm h-full min-h-[500px] flex items-center justify-center">
                <LoadingState />
              </div>
            ) : result ? (
              <div className="space-y-6">
                <SummaryBar />
                <div className="h-px bg-slate-200" />
                <ExportButtons />
                <SemesterPlanGrid />
                <div className="h-px bg-slate-200" />
                <NextTermRecommendations />
                <div className="h-px bg-slate-200" />
                <RequirementsChecklist />

                {/* Footer attribution */}
                <p className="text-xs text-center text-slate-400 pb-4">
                  For advising reference only. Always confirm with your{" "}
                  <a href="https://advising.arizona.edu" target="_blank" rel="noopener noreferrer" className="text-ua-sky hover:underline">
                    UA academic advisor
                  </a>.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm min-h-[500px] flex items-center justify-center">
                <EmptyState />
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
