# UA DegreePlan Copilot

A transcript-driven academic advisor UI that helps University of Arizona students check feasibility of adding a Mathematics second major and generates a personalized semester-by-semester plan.

Built for the **Google Gemini Hackathon** — powered by Gemini AI.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔧 Setup

### shadcn/ui

The project uses shadcn/ui components. They are already included inline in `app/components/ui/`. No additional shadcn setup needed.

If you want to add more shadcn components later:
```bash
npx shadcn-ui@latest add <component-name>
```

---

## 🎭 Demo Mode vs Live Mode

### Demo Mode (default: ON)
- Toggle shows **Mock** badge in top-right of header
- Uses `MOCK_PLAN_RESULT` from `/data/mockData.ts`
- Simulates 1.2s loading delay
- No backend required
- Click **"Load sample transcript"** in the transcript card to auto-fill

### Switching to Live Mode

1. Click the **Mock** button in the header — it will switch to **Live**
2. The app will now call `POST /api/plan` with:
   ```json
   {
     "profile": { ... },
     "transcriptText": "..."
   }
   ```
3. **To connect to Gemini**: Edit `/app/api/plan/route.ts` and replace the mock section with your Gemini API call:

```typescript
// Replace this in /app/api/plan/route.ts:
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

const prompt = `
  You are a UA academic advisor. Given this transcript and student profile, 
  generate a JSON degree plan for adding a Mathematics second major.
  
  Profile: ${JSON.stringify(profile)}
  Transcript: ${transcriptText}
  
  Return ONLY valid JSON matching this schema: [paste schema here]
`;

const result = await model.generateContent(prompt);
const planJSON = JSON.parse(result.response.text());
return NextResponse.json(planJSON);
```

4. Add your Gemini API key to `.env.local`:
```
GEMINI_API_KEY=your_key_here
```

---

## 📁 Project Structure

```
app/
  page.tsx              # Main UI
  layout.tsx            # Root layout + Toaster
  globals.css           # Global styles + CSS variables
  api/
    plan/
      route.ts          # POST /api/plan (returns mock or calls Gemini)
  components/
    ui/                 # shadcn/ui components
    StudentProfileCard.tsx
    TranscriptInputCard.tsx
    SummaryBar.tsx
    SemesterPlanGrid.tsx
    RequirementsChecklist.tsx
    NextTermRecommendations.tsx
    ExportButtons.tsx
    LoadingState.tsx
    EmptyState.tsx
    toaster.tsx
data/
  mockData.ts           # Sample plan result + sample transcript
lib/
  store.ts              # Zustand global state
  utils.ts              # Tailwind merge utility
  use-toast.ts          # Toast hook
```

---

## 🎨 Design

- **Palette**: UA Official — Navy (`#0C234B`), Red (`#AB0520`), Copper (`#B3781B`), Desert Sage (`#4A7C59`)
- **Typography**: Playfair Display (headings) + DM Sans (body) + JetBrains Mono (course codes)
- **Aesthetic**: Refined academic dashboard with desert warmth

---

## 📊 Mock Data Schema

The plan result JSON shape:

```typescript
{
  feasibility: "High" | "Medium" | "Low"
  estimatedGraduationTerm: string       // e.g. "Spring 2027"
  remainingUnits: number
  riskFlags: string[]
  semesters: [{
    term: string
    totalUnits: number
    courses: [{
      code: string
      title: string
      units: number
      warnings: string[]
    }]
  }]
  requirements: [{
    name: string
    status: "Satisfied" | "Remaining"
    evidenceUrl: string
  }]
  recommendations: [{
    term: string
    items: [{
      code: string
      title: string
      sections: number
      modality: string
      instructors: string[]
    }]
  }]
}
```

---

## 🏆 Hackathon Notes

- This frontend is production-ready and connects to any backend via `/api/plan`
- Export CSV is fully functional client-side
- All state managed in Zustand — easy to extend
- Demo flows smoothly without any backend

**Bear Down! 🐻**
