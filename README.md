# ClipMind

AI-powered meeting intelligence. Upload an audio recording → get a structured brief with summary, decisions, action items (with owners and due dates), and the full transcript.

**Live demo:** https://clipmind.vercel.app (sign up with any email to try)

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript + Tailwind
- **Auth:** Clerk (multi-tenant data isolation)
- **DB:** Neon Postgres + Drizzle ORM
- **File storage:** UploadThing (audio uploads up to 32 MB)
- **Transcription:** Groq Whisper (`whisper-large-v3`)
- **Structured extraction:** Groq Llama 3.3 70B with strict JSON-schema validation (Zod)
- **Deployment:** Vercel

## What it does

End-to-end pipeline:

1. User uploads an audio recording (mp3/m4a/wav)
2. File is stored via UploadThing; a `meetings` row is created with status `uploaded`
3. `/api/process` runs the async pipeline: Groq Whisper transcribes → Llama 3.3 70B extracts structured JSON (title, summary, decisions, action items with owners and due dates) → output is validated against a Zod schema → results saved to Postgres
4. The meeting page auto-refreshes every 4s while status is `transcribing` or `extracting`, showing live progress through a status machine (`uploaded → transcribing → extracting → completed`)
5. Failed jobs surface a clean error state instead of hanging

## Why these design choices

| Decision | Why |
|---|---|
| Status machine instead of inline processing | Audio processing takes 30-90s — too long for a single HTTP request. The state machine lets the upload return instantly and the UI poll for progress. |
| Server-to-server fetch from upload handler to `/api/process` | Decouples upload from processing. Failures don't roll back the upload, and processing can be re-triggered without re-uploading. |
| `INTERNAL_SECRET` header instead of Clerk session | The processing endpoint is invoked server-to-server with no cookie. A shared secret authenticates the caller (Clerk is bypassed for this route in middleware). |
| Zod schema validation on LLM output | LLMs return malformed JSON occasionally even with `response_format: json_object`. Zod catches shape errors at runtime so failures surface during processing, not when the UI tries to render. |
| Groq instead of OpenAI/Anthropic | Same API key serves both Whisper and the LLM. Generous free tier. ~10× faster inference than OpenAI Whisper. |
| Drizzle ORM over Prisma | Lightweight client (no heavy runtime), serverless-friendly cold-start, excellent TypeScript inference without code generation. |
| Polling (4s) over WebSockets/SSE | Simplest infrastructure for a 30-90 second job. Zero additional dependencies. WebSockets add complexity for marginal UX gain at this scale. |

## Setup

### 1. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` with keys from:
- **Neon** (https://neon.tech) — `DATABASE_URL`
- **Clerk** (https://clerk.com) — `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- **UploadThing** (https://uploadthing.com) — `UPLOADTHING_TOKEN`
- **Groq** (https://console.groq.com) — `GROQ_API_KEY`
- `INTERNAL_SECRET` — any random string (used to authenticate the upload-to-process trigger)

### 2. Database schema

```bash
npm run db:push
```

Creates `meetings` and `action_items` tables in your Neon database.

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000. Clerk will prompt sign-in, then you'll land on the dashboard.

## Architecture

```
User uploads audio
    ↓
UploadThing → stores file, fires onUploadComplete callback
    ↓
Callback inserts meeting row (status: uploaded) → fetches /api/process
    ↓
/api/process:
  ├─ Update status: transcribing
  ├─ Groq Whisper → transcript + duration
  ├─ Update status: extracting
  ├─ Llama 3.3 70B → structured JSON (summary, decisions, action items)
  ├─ Zod validation
  └─ Save to DB + status: completed
    ↓
Meeting detail page polls every 4s while processing
    ↓
Renders summary, decisions, action items, full transcript
```

## Project layout

```
clipmind/
├── app/
│   ├── api/
│   │   ├── process/route.ts          ← pipeline: transcribe + extract
│   │   └── uploadthing/
│   │       ├── core.ts               ← upload config + triggers /api/process
│   │       └── route.ts
│   ├── meetings/[id]/
│   │   ├── page.tsx                  ← meeting detail (Server Component)
│   │   └── auto-refresh.tsx          ← polls while processing
│   ├── sign-in/[[...sign-in]]/page.tsx
│   ├── sign-up/[[...sign-up]]/page.tsx
│   ├── layout.tsx                    ← ClerkProvider wrapper
│   └── page.tsx                      ← dashboard + upload zone
├── components/upload-zone.tsx        ← drag-drop upload UI
├── lib/
│   ├── db/
│   │   ├── index.ts                  ← Drizzle client
│   │   └── schema.ts                 ← meetings + action_items tables
│   ├── groq.ts                       ← Whisper transcription wrapper
│   ├── llm.ts                        ← Llama 3.3 extraction + Zod validation
│   ├── uploadthing.ts                ← UploadThing helpers
│   └── utils.ts
├── proxy.ts                          ← Clerk auth middleware (Next 16 renamed from middleware)
└── drizzle.config.ts
```

## Deploy to Vercel

1. Push to GitHub
2. Import on Vercel → add all env vars from `.env.local`
3. After first deploy, set `NEXT_PUBLIC_APP_URL` to your Vercel URL
4. Redeploy

## Known limitations

- **Audio length:** 32 MB UploadThing limit (~30 min high-quality, 90 min compressed)
- **Long transcripts:** Llama 3.3's 128K context handles ~60 min of speech comfortably; longer would need sliding-window summarization
- **Free-tier rate limits:** Groq free tier is 30 RPM. Heavy concurrent use would benefit from upgrading to dev tier or adding a job queue (Upstash QStash)

## Built by

[Rahul Vignesh](https://github.com/rahul-2707-blip)
