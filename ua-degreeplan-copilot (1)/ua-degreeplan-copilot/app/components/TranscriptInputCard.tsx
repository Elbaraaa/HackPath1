"use client";
import { useRef } from "react";
import { useAppStore } from "@/lib/store";
import { SAMPLE_TRANSCRIPT } from "@/data/mockData";
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/ui/tabs";
import { Button } from "@/app/components/ui/button";
import { FileText, Upload, Sparkles } from "lucide-react";

export function TranscriptInputCard() {
  const { transcriptText, setTranscriptText } = useAppStore();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Card className="border-ua-blue/20 bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-ua-blue font-display text-base">
          <FileText className="h-4 w-4" />
          Transcript
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="paste">
          <TabsList className="w-full mb-3">
            <TabsTrigger value="paste" className="flex-1 text-xs">
              Paste Text
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex-1 text-xs">
              Upload PDF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="space-y-2">
            <textarea
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder="Paste your unofficial transcript here..."
              className="w-full h-44 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-ua-blue/50 leading-relaxed"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTranscriptText(SAMPLE_TRANSCRIPT)}
              className="w-full text-xs border-ua-blue/30 text-ua-blue hover:bg-ua-blue/5 gap-1.5"
            >
              <Sparkles className="h-3 w-3" />
              Load sample transcript
            </Button>
          </TabsContent>

          <TabsContent value="upload" className="space-y-3">
            <div
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center h-44 rounded-md border-2 border-dashed border-ua-blue/25 bg-ua-warmgray/30 cursor-pointer hover:border-ua-blue/50 hover:bg-ua-blue/5 transition-colors"
            >
              <Upload className="h-8 w-8 text-ua-blue/40 mb-2" />
              <p className="text-sm font-medium text-slate-600">Click to upload PDF</p>
              <p className="text-xs text-slate-400 mt-1">UA unofficial transcript</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setTranscriptText(`[PDF Uploaded: ${file.name}]\n\nNote: OCR coming soon. Please use "Paste Text" tab for demo mode.`);
                }
              }}
            />
            <p className="text-xs text-slate-400 text-center">
              PDF parsing available in production mode
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
