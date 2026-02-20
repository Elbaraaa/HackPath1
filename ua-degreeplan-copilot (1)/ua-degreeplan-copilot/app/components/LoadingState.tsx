"use client";
import { useEffect, useState } from "react";

const MESSAGES = [
  "Parsing transcript...",
  "Mapping completed requirements...",
  "Checking prerequisite chains...",
  "Analyzing Math BA/BS requirements...",
  "Optimizing semester load...",
  "Flagging scheduling conflicts...",
  "Building your plan...",
];

export function LoadingState() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      {/* UA-themed spinner */}
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-4 border-ua-warmgray" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-ua-blue border-r-ua-red animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-ua-copper animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-slate-700 min-h-[20px] transition-all">
          {MESSAGES[msgIndex]}
        </p>
        <p className="text-xs text-slate-400">Powered by Gemini</p>
      </div>
    </div>
  );
}
