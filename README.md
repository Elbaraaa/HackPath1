# HackPath1

ua-degreeplan-copilot/
├── app/
│   ├── page.tsx                     ← Main UI (header + 2-col layout)
│   ├── layout.tsx                   ← Root layout + Toaster
│   ├── globals.css                  ← UA brand colors, Playfair + DM Sans fonts
│   ├── api/plan/route.ts            ← Mock API (swap in Gemini calls here)
│   └── components/
│       ├── StudentProfileCard.tsx   ← Standing/Major/GradTerm/Units/Summer
│       ├── TranscriptInputCard.tsx  ← Paste/Upload tabs + "Load sample"
│       ├── SummaryBar.tsx           ← Feasibility pill + metrics + risk flags
│       ├── SemesterPlanGrid.tsx     ← Color-coded cards per term
│       ├── RequirementsChecklist.tsx← Progress bar + table with catalog links
│       ├── NextTermRecommendations.tsx ← Instructor modal (RateMyProfessors links)
│       ├── ExportButtons.tsx        ← Working CSV export + PDF stub
│       ├── LoadingState.tsx         ← Animated UA-themed spinner
│       └── EmptyState.tsx
├── lib/store.ts                     ← Zustand global state
├── data/mockData.ts                 ← Full sample plan + transcript
└── README.md                        ← Setup + how to wire in Gemini
