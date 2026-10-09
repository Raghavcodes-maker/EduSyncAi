# EduSync AI — Evidence-Based Academic Research Agent

**AZINHACK 2026 · USAR, GGSIPU**

EduSync AI transforms a basic AI study planner into an evidence-based academic research agent. Students enter their syllabus, exam date, and available study time — the app researches real educational resources via TinyFish and builds a source-backed, prioritized study plan.

## Features

- **Onboarding wizard** — name, school/college, subject selection, preparation levels, exam dates
- **Dashboard** — academic health, subject status, tasks, weekly progress, upcoming exams, priorities
- **Subjects** — add/edit/delete subjects with preparation tracking, difficulty, exam dates, pending topics
- **Study Planner** — weekly schedule with AI plan generation based on available hours
- **Research Agent** — the core hackathon feature:
  1. Student selects a subject, enters syllabus topics, exam date, and available study hours/day
  2. The app calls the TinyFish Search API (server-side) for each topic
  3. Real resources are displayed with title, URL, snippet, and topic relevance
  4. A prioritized study plan is generated, ordered by exam urgency and available time
  5. Each resource has a clickable source link
  6. Students can mark topics complete and track progress
- **What-If Simulator** — explore how different study schedules affect exam readiness
- **AI Assistant** — conversational study planning helper (demo responses)
- **Fix My Week** — auto-resolve scheduling conflicts and rebalance study sessions

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Icons:** Lucide React
- **Backend:** Supabase (Edge Functions for server-side API calls)
- **Research API:** TinyFish Search API

## Architecture

```
Browser (React)
  └── calls Supabase Edge Function: tinyfish-search
        └── reads TINYFISH_API_KEY from environment (server-side only)
        └── calls https://api.search.tinyfish.ai?query=...
        └── returns structured results to the browser
```

The TinyFish API key is **never** exposed to the browser. It lives only as a Supabase edge function secret and is used server-side within the edge function.

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in the Supabase values (these are pre-populated in the deployed environment):

```bash
cp .env.example .env
```

### 3. Configure the TinyFish API key

The TinyFish API key must be set as a **Supabase edge function secret** (not in `.env`):

1. Get a free API key at [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys)
2. Set it as a secret in your Supabase project dashboard under Edge Functions > Secrets:
   - Name: `TINYFISH_API_KEY`
   - Value: your API key

Or via the Supabase CLI:
```bash
supabase secrets set TINYFISH_API_KEY=your_key_here
```

Without this key, the Research Agent will show a clear error explaining the key is not configured. No fake results are shown.

### 4. Run

```bash
npm run dev
```

### 5. Build for production

```bash
npm run build
```

## Hackathon Demo Workflow

1. Complete onboarding (enter name, select college, choose subjects)
2. Navigate to **Research Agent** in the sidebar
3. Select a subject (e.g. "Data Structures")
4. Enter syllabus topics: `Binary Search Trees, Graph Traversals, Dynamic Programming, Hash Tables`
5. Set the exam date and available study hours (e.g. 4 hours/day)
6. Choose "Web Resources" or "Research Papers"
7. Click **Research & Generate Study Plan**
8. Watch live TinyFish results stream in with real titles, URLs, and snippets
9. Expand each topic to see clickable source links
10. Mark topics complete and watch the progress bar update

## TinyFish API Reference

- **Endpoint:** `GET https://api.search.tinyfish.ai?query=<query>`
- **Auth:** `X-API-Key` header
- **Response:** `{ query, results: [{ position, site_name, title, snippet, url }], total_results, page }`
- **Options:** `domain_type` (web, news, research_paper), `purpose`, `recency_minutes`, `after_date`, `before_date`
- **Docs:** [docs.tinyfish.ai](https://docs.tinyfish.ai/search-api)

## Project Structure

```
src/
  components/
    layout/          — Sidebar, TopBar
    ui/              — Card, Button, ProgressBar, etc.
    views/           — Dashboard, Subjects, StudyPlanner, ResearchAgent, etc.
  context/           — AppContext (global state, localStorage)
  lib/               — tinyfish.ts (client for the edge function)
  types.ts           — TypeScript types
supabase/
  functions/
    tinyfish-search/ — Edge function (server-side TinyFish API proxy)
  config.toml        — Supabase configuration
```

## License

MIT — Built for AZINHACK 2026.
