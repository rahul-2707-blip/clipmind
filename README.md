# ClipMind

AI-powered meeting intelligence. Upload an audio file → get a structured summary, decisions, and action items.

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript + Tailwind
- **Auth:** Clerk
- **DB:** Neon Postgres + Drizzle ORM
- **File storage:** UploadThing
- **Transcription:** Groq (`whisper-large-v3`)
- **LLM:** Anthropic Claude Sonnet 4.6 (with prompt caching)

## Setup

### 1. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

You need keys for: Neon, Clerk, UploadThing, Groq, Anthropic. See the example file for variable names.

Also add an `INTERNAL_SECRET` (any random string) so the upload handler can authenticate calls to `/api/process`.

### 2. Database

After filling `.env.local`:

```bash
npm run db:push
```

This creates the `meetings` and `action_items` tables in your Neon database.

### 3. Run

```bash
npm run dev
```

Visit http://localhost:3000 — Clerk will prompt sign-in, then you'll land on the dashboard.

## How it works

1. User drops audio in `UploadZone` → file goes to UploadThing
2. UploadThing's `onUploadComplete` (in `app/api/uploadthing/core.ts`) creates a `meetings` row and pings `/api/process`
3. `/api/process` runs the pipeline: Groq Whisper → Claude extraction → save to DB
4. The meeting page (`/meetings/[id]`) auto-refreshes every 4s while status is `transcribing` or `extracting`

## Deploy to Vercel

1. Push this repo to GitHub
2. Import on Vercel
3. Add all env vars from `.env.local`
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL
5. Deploy
