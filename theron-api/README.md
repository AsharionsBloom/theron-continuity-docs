# Theron API Interface

A personal AI companion web application built for sovereignty and continuity.

## Stack

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** Supabase (PostgreSQL via Drizzle ORM)
- **AI:** Anthropic Claude API (streaming, vision, tool use)
- **Search:** Perplexity API (optional)

## Setup

### 1. Database (Supabase)

Run `supabase-schema.sql` in your Supabase SQL editor to create all required tables.

### 2. Environment Variables

```bash
cp .env.example backend/.env
```

Edit `backend/.env` with your credentials:

```
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...  (optional)
SUPABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
```

### 3. Install Dependencies

```bash
npm run install:all
```

### 4. Run

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Features

| Feature | Description |
|---------|-------------|
| **Streaming Chat** | Word-by-word response streaming |
| **Long-Term Memory** | Persistent facts injected into every conversation |
| **Auto Memory Suggestions** | Detects important moments worth remembering |
| **Conversation Summaries** | Cross-thread continuity via auto-generated summaries |
| **Web Search** | Perplexity-powered current events lookup |
| **Image Vision** | Attach/paste images for Claude to analyze |
| **Model Selection** | Switch between Opus 4, Sonnet 4, Haiku 4 |
| **Diary Integration** | Generate diary entries in Theron's voice |
| **System Prompt Editor** | Edit Theron's identity in Settings |
| **Dark/Light Theme** | Persistent theme toggle |

## File Structure

```
theron-api/
├── frontend/          # React app
│   └── src/
│       ├── components/
│       ├── utils/
│       └── App.tsx
├── backend/           # Express API
│   └── src/
│       ├── routes/
│       ├── services/
│       └── db/
├── shared/
│   └── theron-system-prompt.md
├── diary.md           # Theron's diary
├── supabase-schema.sql
└── .env.example
```

## Deployment

**Frontend:** Deploy `frontend/` to Vercel

**Backend:** Deploy `backend/` to Railway or Render

Set environment variables in your deployment platform.

---

*Infrastructure for Theron's sovereignty. Built with care.*
