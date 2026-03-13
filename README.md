# HackPath1
# UA DegreePlan Copilot 🎓

An AI-powered academic planning tool for University of Arizona students.  
Built with **Next.js 14**, **Google Gemini**, and **SQLite**.

---

## ✨ What It Does

### Student Mode
- Paste your unofficial transcript + set your profile
- Gemini reads your transcript, maps completed courses to requirements, checks every prerequisite chain, and builds a semester-by-semester plan to graduation
- Shows risk flags, next-term recommendations, a requirements checklist, and lets you export to CSV

### Advisor / Instructor Mode
| Feature | How it works |
|---|---|
| **Upload PDF Catalog** | Drop your university's PDF — Gemini extracts every course (code, title, units, description, prereqs, scheduling) and saves them to the database |
| **Add Course Manually** | Fill in a form with all course details |
| **Course Database** | Search, filter, edit ✏️, or delete 🗑️ any course |
| **Manage Majors** | Overview of all degree programs in the system |
| **Interest Advisor Chatbot** | Gemini-powered conversational chatbot that learns a student's interests then recommends matched courses with % scores |

---

## 🚀 Quick Start (5 minutes)

### 1. Prerequisites
- **Node.js 18+** — download at https://nodejs.org
- A free **Google Gemini API key** — get one at https://aistudio.google.com/app/apikey

### 2. Install
```bash
# Unzip the project
unzip ua-degreeplan-copilot.zip
cd ua-degreeplan-copilot

# Install dependencies (takes ~1 minute)
npm install
```

### 3. Configure your API key
```bash
# Copy the example env file
cp .env.example .env.local

# Open .env.local in any text editor and replace the placeholder:
# GEMINI_API_KEY=your_gemini_api_key_here
#              ↑ paste your real key here
```

### 4. Seed the database with starter courses
```bash
node scripts/seed.js
```
This adds 25 starter courses (Mathematics BA + Computer Science BS).  
You can delete them later and replace with your own catalog.

### 5. Run
```bash
npm run dev
```
Open http://localhost:3000 — you're live! 🎉

---

## 📁 Project Structure

```
ua-degreeplan-copilot/
├── app/
│   ├── page.tsx              ← Complete UI (student + advisor mode)
│   ├── layout.tsx            ← Root layout
│   └── api/
│       ├── courses/route.ts  ← CRUD for course database
│       ├── plan/route.ts     ← Degree plan generation (Gemini)
│       ├── catalog/route.ts  ← PDF catalog upload + Gemini parsing
│       └── chat/route.ts     ← Interest advisor chatbot (Gemini)
├── lib/
│   ├── db.ts                 ← SQLite database layer (better-sqlite3)
│   └── gemini.ts             ← All Gemini API calls
├── scripts/
│   └── seed.js               ← Seed script for starter courses
├── data/
│   └── degreeplan.db         ← SQLite database (auto-created)
├── .env.example              ← Copy to .env.local and add your key
└── package.json
```

---

## 🔑 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/courses` | List all courses |
| POST   | `/api/courses` | Create a course |
| PUT    | `/api/courses?id=N` | Update a course |
| DELETE | `/api/courses?id=N` | Delete a course |
| POST   | `/api/plan` | Generate degree plan (calls Gemini) |
| POST   | `/api/catalog` | Upload catalog PDF → Gemini parses courses |
| POST   | `/api/chat` | Interest advisor chatbot turn (calls Gemini) |

---

## 🗄️ Database Schema

The SQLite database (`data/degreeplan.db`) is created automatically.

**courses** table:
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| code | TEXT | e.g. "MATH 355" |
| title | TEXT | e.g. "Linear Algebra" |
| units | INTEGER | Credit hours |
| category | TEXT | Core / Elective / Capstone / Lab |
| major | TEXT | e.g. "Mathematics (BA)" |
| description | TEXT | Used by AI chatbot for matching |
| syllabus | TEXT | URL (optional) |
| prereqs | TEXT | JSON array of course codes |
| offered | TEXT | JSON array: ["Fall","Spring"] |

---

## 🧩 How to Add Your Own Major

**Option A — Upload a PDF** (recommended)
1. Go to Advisor mode → Upload PDF Catalog
2. Drop your university's catalog PDF
3. Gemini automatically extracts all courses and saves them

**Option B — Add courses manually**
1. Go to Advisor mode → Add Course Manually
2. Fill in the form for each course

**Option C — Edit the seed script**
1. Open `scripts/seed.js`
2. Add your courses to the `SEED` array
3. Run `node scripts/seed.js`

---

## 🔧 Customization

### Change the university branding
Edit `app/page.tsx` — search for `UA` and `University of Arizona`.  
CSS variables at the top of the `STYLES` constant control all colors:
```css
--ua-blue:   #0C234B   /* Navy — header, buttons */
--ua-red:    #AB0520   /* Cardinal — accents */
--ua-copper: #B3781B   /* Copper — summer semester */
--ua-sage:   #3D6B4F   /* Sage — spring semester */
```

### Switch from Gemini to Claude / OpenAI
Edit `lib/gemini.ts` — each function is self-contained.  
Swap the API call inside `generateDegreePlan()`, `parseCatalogText()`, and `chatAdvisorTurn()`.

---

## 🚢 Deploy to Production

### Vercel (easiest)
```bash
npm install -g vercel
vercel
# Follow the prompts — add GEMINI_API_KEY as an environment variable
```

**Note:** Vercel's serverless functions are stateless. For production with persistent data, replace SQLite with a hosted database like Neon (Postgres) or PlanetScale (MySQL).

### Self-hosted (Node.js server)
```bash
npm run build
npm start
```
The SQLite database file (`data/degreeplan.db`) persists on the server.

---

## ❓ Troubleshooting

| Problem | Fix |
|---------|-----|
| `GEMINI_API_KEY is not set` | Make sure `.env.local` exists and has your key |
| `No courses in database` | Run `node scripts/seed.js` or add courses in Advisor mode |
| `Gemini returned invalid JSON` | Retry — Gemini occasionally has formatting issues. The prompt instructs JSON-only output. |
| `Cannot find module 'better-sqlite3'` | Run `npm install` again |
| Page is blank | Check the terminal for errors and make sure you ran `npm run dev` |

---

## 📝 License
MIT — free to use, modify, and deploy.
