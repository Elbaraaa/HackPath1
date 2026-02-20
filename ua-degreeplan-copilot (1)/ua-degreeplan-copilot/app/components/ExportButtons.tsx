"use client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/app/components/ui/button";
import { toast } from "@/lib/use-toast";
import { Download, FileText } from "lucide-react";

export function ExportButtons() {
  const { result } = useAppStore();
  if (!result) return null;

  const exportCSV = () => {
    const rows: string[][] = [];

    // Header section
    rows.push(["UA DegreePlan Copilot Export"]);
    rows.push(["Feasibility", result.feasibility]);
    rows.push(["Estimated Graduation", result.estimatedGraduationTerm]);
    rows.push(["Remaining Units", String(result.remainingUnits)]);
    rows.push([]);

    // Semesters
    rows.push(["SEMESTER PLAN"]);
    rows.push(["Term", "Course Code", "Title", "Units", "Warnings"]);
    for (const sem of result.semesters) {
      for (const course of sem.courses) {
        rows.push([sem.term, course.code, course.title, String(course.units), course.warnings.join("; ")]);
      }
    }
    rows.push([]);

    // Requirements
    rows.push(["REQUIREMENTS CHECKLIST"]);
    rows.push(["Requirement", "Status", "Catalog URL"]);
    for (const req of result.requirements) {
      rows.push([req.name, req.status, req.evidenceUrl]);
    }

    const csvContent = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ua-degreeplan.csv";
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: "CSV exported!", description: "Your degree plan has been downloaded." });
  };

  const exportPDF = () => {
    toast({
      title: "PDF export — coming soon",
      description: "This feature will be available in the next release.",
    });
  };

  return (
    <div className="flex gap-2 animate-fade-in">
      <Button
        onClick={exportCSV}
        variant="outline"
        size="sm"
        className="flex-1 gap-1.5 border-ua-blue/25 text-ua-blue hover:bg-ua-blue/5 text-xs"
      >
        <Download className="h-3.5 w-3.5" />
        Export CSV
      </Button>
      <Button
        onClick={exportPDF}
        variant="outline"
        size="sm"
        className="flex-1 gap-1.5 border-ua-copper/25 text-ua-copper hover:bg-ua-copper/5 text-xs"
      >
        <FileText className="h-3.5 w-3.5" />
        Export PDF
      </Button>
    </div>
  );
}
