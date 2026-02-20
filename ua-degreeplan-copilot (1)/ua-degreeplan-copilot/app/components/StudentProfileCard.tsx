"use client";
import { useAppStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/ui/card";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Slider } from "@/app/components/ui/slider";
import { Switch } from "@/app/components/ui/switch";
import { GraduationCap } from "lucide-react";

const STANDINGS = ["Freshman", "Sophomore", "Junior", "Senior"];
const MAJORS = ["Computer Science (BS)"];
const SECOND_MAJORS = ["Mathematics (BA)", "Mathematics (BS)"];

function generateGradTerms() {
  const terms: string[] = [];
  for (let yr = 2026; yr <= 2030; yr++) {
    terms.push(`Spring ${yr}`);
    terms.push(`Fall ${yr}`);
  }
  return terms;
}

export function StudentProfileCard() {
  const { profile, setProfile } = useAppStore();

  return (
    <Card className="border-ua-blue/20 bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-ua-blue font-display text-base">
          <GraduationCap className="h-4 w-4" />
          Student Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 uppercase tracking-wide">Standing</Label>
            <Select
              value={profile.standing}
              onValueChange={(v) => setProfile({ standing: v })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STANDINGS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 uppercase tracking-wide">Primary Major</Label>
            <Select
              value={profile.major}
              onValueChange={(v) => setProfile({ major: v })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAJORS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 uppercase tracking-wide">Second Major</Label>
          <Select
            value={profile.secondMajor}
            onValueChange={(v) => setProfile({ secondMajor: v })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SECOND_MAJORS.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 uppercase tracking-wide">Expected Graduation</Label>
          <Select
            value={profile.graduationTerm}
            onValueChange={(v) => setProfile({ graduationTerm: v })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {generateGradTerms().map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-500 uppercase tracking-wide">Max Units / Semester</Label>
            <span className="text-sm font-semibold text-ua-blue tabular-nums">
              {profile.maxUnitsPerSem} units
            </span>
          </div>
          <Slider
            min={12}
            max={19}
            step={1}
            value={[profile.maxUnitsPerSem]}
            onValueChange={([v]) => setProfile({ maxUnitsPerSem: v })}
            className="[&_[role=slider]]:bg-ua-blue"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>12</span>
            <span>19</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-ua-warmgray px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-slate-700">Summer Sessions</p>
            <p className="text-xs text-slate-400">Include summer enrollment in plan</p>
          </div>
          <Switch
            checked={profile.summerAllowed}
            onCheckedChange={(v) => setProfile({ summerAllowed: v })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
