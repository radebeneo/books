# Books — AI Voice Reading Library

> Transform your PDF books into real-time AI voice conversations.
> Upload a book, choose a voice, and talk to an AI that has read it.

---

## Overview

**Books** is a Next.js 16 web application that lets authenticated users build a personal library of PDF books and have real-time voice conversations with an AI assistant grounded in each book's content.

Users upload a PDF, the app parses and indexes the full text into MongoDB, auto-generates a cover from the first page, and stores the file in Vercel Blob. From the book detail page, users start a VAPI-powered voice session and speak directly with an AI that answers questions, summarises chapters, and discusses ideas drawn exclusively from that book.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript 5 |
| Styling | Tailwind CSS v4 + `tw-animate-css` |
| Components | shadcn/ui (Radix UI primitives) |
| Auth | Clerk (`@clerk/nextjs` v7) |
| Database | MongoDB + Mongoose 9 |
| File Storage | Vercel Blob |
| PDF Parsing | `pdfjs-dist` v5 (client-side) |
| Forms | React Hook Form + Zod v4 |
| Voice AI | VAPI (pre-configured assistant) |
| TTS | ElevenLabs (5 selectable voices) |
| Notifications | Sonner |
| Icons | Lucide React |
| Fonts | IBM Plex Serif + Mona Sans |

---

## Project Structure

```
books/
├── app/
│   ├── (root)/                  # Authenticated app pages
│   │   ├── page.tsx             # Home — library grid + Hero
│   │   └── books/new/page.tsx   # Upload new book
│   ├── api/upload/route.ts      # Vercel Blob upload handler
│   ├── globals.css              # Design tokens + utility classes
│   └── layout.tsx               # Root layout: ClerkProvider, fonts, Navbar
├── components/
│   ├── BookCard.tsx
│   ├── Hero.tsx
│   ├── LoadingOverlay.tsx
│   ├── Navbar.tsx
│   ├── UploadForm.tsx
│   └── ui/                      # shadcn/ui primitives (do not modify directly)
├── context/                     # Six-file agent context system
│   ├── project-overview.md
│   ├── architecture.md
│   ├── ui-context.md
│   ├── code-standards.md
│   ├── ai-workflow-rules.md
│   └── progress-tracker.md
├── database/
│   ├── mongoose.ts              # Singleton MongoDB connection
│   └── models/
│       ├── book.model.ts
│       ├── book-segment.model.ts
│       └── voice-session.model.ts
├── lib/
│   ├── actions/book.actions.ts  # Server Actions
│   ├── constants.ts             # App-wide constants + voice config
│   ├── utils.ts                 # cn, serializeData, generateSlug, parsePDFFile
│   └── validators.ts            # Zod file schemas
├── types.d.ts                   # Global TypeScript interfaces
├── AGENTS.md                    # AI agent reference file
└── next.config.ts
```

---

## Environment Variables

Create a `.env.local` file in the project root. **Never commit this file.**

```env
# MongoDB
MONGODB_URI=

# Vercel Blob
BLOB_READ_WRITE_TOKEN=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# VAPI
NEXT_PUBLIC_ASSISTANT_ID=
```

| Variable | Where to get it |
|---|---|
| `MONGODB_URI` | [MongoDB Atlas](https://cloud.mongodb.com) → Connect → Drivers |
| `BLOB_READ_WRITE_TOKEN` | [Vercel Dashboard](https://vercel.com) → Storage → Blob |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [Clerk Dashboard](https://dashboard.clerk.com) → API Keys |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `NEXT_PUBLIC_ASSISTANT_ID` | [VAPI Dashboard](https://dashboard.vapi.ai) → Assistants |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## Core User Flow

1. Sign in via Clerk
2. Navigate to **Add New** → fill in title, author, voice persona
3. Upload a PDF (≤ 50 MB) and optional cover image (≤ 10 MB)
4. The app parses the PDF client-side, splits the text into segments, and uploads files to Vercel Blob
5. Book metadata and text segments are saved to MongoDB
6. Navigate to the book detail page and start a voice session
7. Speak with the AI — it answers questions grounded in your book's content

---

## AI Agent Context

This project uses a six-file context system for AI coding agents. See [`AGENTS.md`](./AGENTS.md) for the full reference, and the [`context/`](./context/) directory for the living spec files.

Before implementing any feature, agents read the context files in this order:

1. `context/project-overview.md`
2. `context/architecture.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

---

## License

Private project. All rights reserved.
