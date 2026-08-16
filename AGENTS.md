# AGENTS.md — Books AI Voice Library

> This file is the authoritative reference for AI coding agents working on this codebase.
> Read this fully before making any changes.

---

## 1. Project Overview

**Books** is a Next.js 16 web application that lets authenticated users transform PDF books into interactive AI-powered voice conversations. Users upload a PDF, the app parses and indexes its text into MongoDB, and then allows the user to talk to an AI assistant that has been grounded in that book's content — powered by VAPI for real-time voice AI and ElevenLabs for TTS.

**Core User Flow:**
1. User signs in via Clerk authentication.
2. User uploads a PDF book (up to 50 MB) along with a title, author name, and an AI voice persona.
3. The app client-side parses the PDF using `pdfjs-dist`, splits the text into overlapping segments, renders the first page as the cover image, and uploads both the PDF and cover to **Vercel Blob**.
4. The book record and its text segments are saved to **MongoDB** via Mongoose.
5. User navigates to the book detail page and starts a voice session with the AI.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS v4 + `tw-animate-css` |
| Component Library | shadcn/ui (Radix UI primitives) |
| Auth | Clerk (`@clerk/nextjs` v7) |
| Database | MongoDB via Mongoose 9 |
| File Storage | Vercel Blob (`@vercel/blob`) |
| PDF Parsing | `pdfjs-dist` v5 (client-side) |
| Forms | React Hook Form + Zod validation |
| Voice AI | VAPI (assistant ID from env) |
| TTS | ElevenLabs (voice IDs in `lib/constants.ts`) |
| Notifications | Sonner toast |
| Icons | Lucide React |
| Fonts | IBM Plex Serif, Mona Sans (Google Fonts via `next/font`) |

---

## 3. Project Structure

```
books/
├── app/
│   ├── (root)/                  # Route group — public/authenticated app pages
│   │   ├── page.tsx             # Home page: library grid + Hero
│   │   └── books/
│   │       └── new/
│   │           └── page.tsx     # Upload new book page
│   ├── api/
│   │   └── upload/
│   │       └── route.ts         # Vercel Blob upload handler (POST)
│   ├── globals.css              # Global styles, CSS variables, utility classes
│   ├── layout.tsx               # Root layout: ClerkProvider, fonts, Navbar, Toaster
│   └── favicon.ico
├── components/
│   ├── BookCard.tsx             # Book card displayed in the library grid
│   ├── Hero.tsx                 # Hero section on the home page
│   ├── LoadingOverlay.tsx       # Full-screen loading overlay during upload
│   ├── Navbar.tsx               # Top navigation bar with Clerk auth controls
│   ├── UploadForm.tsx           # Multi-step form for uploading a new book
│   └── ui/                      # shadcn/ui base components (do not heavily modify)
│       ├── button.tsx
│       ├── form.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── radio-group.tsx
│       └── sonner.tsx
├── database/
│   ├── mongoose.ts              # Singleton MongoDB connection with global cache
│   └── models/
│       ├── book.model.ts        # Book Mongoose schema/model
│       ├── book-segment.model.ts # BookSegment schema/model (indexed for text search)
│       └── voice-session.model.ts # VoiceSession schema/model
├── lib/
│   ├── actions/
│   │   └── book.actions.ts      # Server Actions: checkBookExists, createBook, saveBookSegments
│   ├── constants.ts             # App-wide constants: colors, sample books, voice options, VAPI config
│   ├── utils.ts                 # Utilities: cn(), serializeData(), generateSlug(), splitIntoSegments(), parsePDFFile()
│   └── validators.ts            # Zod file validators: pdfFileSchema, coverImageSchema
├── types.d.ts                   # Global TypeScript interfaces (IBook, IBookSegment, IVoiceSession, props, etc.)
├── next.config.ts               # Next.js config (remote image patterns)
├── tsconfig.json                # TypeScript strict mode, path alias @/*
├── components.json              # shadcn/ui configuration
├── package.json
└── .env.local                   # Environment variables (never commit)
```

---

## 4. Environment Variables

These must be present in `.env.local`. Never commit this file.

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob API token (used server-side in `/api/upload`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_ASSISTANT_ID` | VAPI pre-configured assistant ID |

> **Note:** The `database/mongoose.ts` module throws immediately at module load time if `MONGODB_URI` is missing. Do not call `connectToDatabase()` in client components.

---

## 5. Coding Conventions

### TypeScript

- Strict mode is enabled. Do not use `any` — use `unknown` and narrow types.
- All global shared types live in `types.d.ts`. Add new shared types there.
- Use `z.infer<typeof Schema>` for Zod-derived types; do not duplicate type definitions.
- Import paths must use the `@/` alias (e.g., `@/lib/utils`, `@/components/Navbar`).

### React & Next.js

- Default to **Server Components**. Only add `"use client"` when the component uses browser APIs, React hooks, or event handlers.
- Default to **Server Actions** (with `"use server"`) for all data mutation. Place them in `lib/actions/`.
- API Routes in `app/api/` are only for third-party integrations that require a `Request`/`Response` contract (e.g., Vercel Blob's `handleUpload`).
- Never call `connectToDatabase()` from client components or API routes — only from Server Actions and Server Components.

### Components

- Page-level components go in `app/(root)/`.
- Reusable UI components go in `components/`.
- `components/ui/` contains raw shadcn/ui primitives. Prefer modifying these sparingly; extend them via wrapper components instead.
- Use semantic HTML elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`).

### Styling

- Use **Tailwind CSS v4** utility classes as the primary styling mechanism.
- Custom CSS utility classes (e.g., `.wrapper`, `.navbar-height`, `.library-hero-card`) are defined in `app/globals.css`. Check there before creating new styles.
- Brand colors:
  - **Primary dark:** `#212a3b` (CSS variable `--brand-color`)
  - **Primary hover:** `#3d485e`
  - **Accent (voice/CTA):** `#663820`
- The `cn()` helper (from `@/lib/utils`) must be used for conditional class merging — never string concatenation.
- Do **not** use inline `style={}` props for colors or spacing that can be expressed in Tailwind or CSS variables.

### Forms

- All forms use **React Hook Form** with **Zod** resolvers.
- File input schemas are defined in `lib/validators.ts`.
- Use `form.setValue()` to update file inputs; never use `register()` directly with file inputs.
- Show user-facing errors via `<FormMessage />` (shadcn/ui). Use `toast.error()` / `toast.info()` from Sonner for non-field-level feedback.

### Slugs & Deduplication

- Book slugs are auto-generated from the title using `generateSlug()` in `lib/utils.ts`.
- `generateSlug()` strips file extensions, lowercases, removes special characters, and replaces spaces with hyphens.
- Before creating a book, always call `checkBookExists(title)` to avoid duplicate entries.

---

## 6. Data Models

### `Book`

| Field | Type | Notes |
|---|---|---|
| `clerkId` | String (required) | Owner's Clerk user ID |
| `title` | String (required) | Book title |
| `slug` | String (required, unique) | Auto-generated from title |
| `author` | String (required) | Book author name |
| `persona` | String (optional) | Voice key selected by user (e.g., `"rachel"`) |
| `fileURL` | String (required) | Vercel Blob public URL for the PDF |
| `fileBlobKey` | String (required) | Vercel Blob pathname (for deletion) |
| `coverURL` | String (optional) | Vercel Blob URL for cover image |
| `coverBlobKey` | String (optional) | Vercel Blob pathname for cover |
| `fileSize` | Number (required) | PDF size in bytes |
| `totalSegments` | Number (default: 0) | Populated after segment indexing |

### `BookSegment`

| Field | Type | Notes |
|---|---|---|
| `clerkId` | String (required) | Owner's Clerk user ID |
| `bookId` | ObjectId → Book | Referenced book |
| `content` | String (required) | Text content of segment |
| `segmentIndex` | Number (required) | Order index, 0-based |
| `pageNumber` | Number (optional) | PDF page number |
| `wordCount` | Number (required) | Word count of segment |

**Indexes:** `{ bookId, segmentIndex }` (unique), `{ bookId, pageNumber }`, text index on `content`.

### `VoiceSession`

| Field | Type | Notes |
|---|---|---|
| `clerkId` | String (required) | User who started the session |
| `bookId` | ObjectId → Book | Book being discussed |
| `startedAt` | Date (default: now) | Session start time |
| `endedAt` | Date (optional) | Session end time |
| `durationSeconds` | Number (default: 0) | Accumulated duration |
| `billingPeriodStart` | Date (required, indexed) | For usage/billing tracking |

**Index:** `{ clerkId, billingPeriodStart }`.

---

## 7. Key Utilities Reference

### `lib/utils.ts`

| Function | Signature | Purpose |
|---|---|---|
| `cn` | `(...inputs: ClassValue[]) => string` | Merge Tailwind classes safely |
| `serializeData` | `<T>(data: T) => T` | Strip Mongoose ObjectIds/Dates to plain JSON |
| `generateSlug` | `(text: string) => string` | URL-safe slug from book title |
| `splitIntoSegments` | `(text, segmentSize?, overlapSize?) => TextSegment[]` | Split PDF text into overlapping word segments (default: 500 words, 50-word overlap) |
| `parsePDFFile` | `(file: File) => Promise<{ content: TextSegment[], cover: string }>` | Client-side PDF parsing: extracts text + renders first page as PNG data URL |

> **Important:** `parsePDFFile` runs **client-side only** — it uses `document.createElement('canvas')`. Do not call it in Server Components or Server Actions.

### `lib/actions/book.actions.ts` (Server Actions)

| Action | Purpose |
|---|---|
| `checkBookExists(title)` | Returns `{ exists: boolean, book? }` — checks by slug |
| `createBook(data: CreateBook)` | Creates book record; returns `{ success, data, alreadyExists? }` |
| `saveBookSegments(bookId, clerkId, segments)` | Bulk inserts BookSegment docs; rolls back on failure |

### `lib/constants.ts`

| Export | Purpose |
|---|---|
| `BRAND_COLOR` / `BRAND_COLOR_HOVER` | Hex values for use in JS (where CSS vars unavailable) |
| `sampleBooks` | Static sample book list for the homepage |
| `MAX_FILE_SIZE` | 50 MB PDF upload limit |
| `ACCEPTED_PDF_TYPES` | `['application/pdf']` |
| `MAX_IMAGE_SIZE` | 10 MB cover image limit |
| `ACCEPTED_IMAGE_TYPES` | JPEG, PNG, WebP |
| `ASSISTANT_ID` | VAPI assistant ID from `NEXT_PUBLIC_ASSISTANT_ID` env var |
| `voiceOptions` | Map of voice key to `{ id, name, description }` (ElevenLabs voice IDs) |
| `voiceCategories` | `{ male: [...], female: [...] }` keys for grouping in UI |
| `DEFAULT_VOICE` | `'rachel'` |
| `VOICE_SETTINGS` | ElevenLabs stability/similarity/speed settings |
| `VAPI_DASHBOARD_CONFIG` | Reference config for VAPI turn-taking (documentation only) |
| `CLERK_AUTH_APPEARANCE_OVERRIDE` | Clerk modal appearance overrides (hardcoded hex — do not replace with Tailwind) |

---

## 8. Authentication

- Auth is handled entirely by **Clerk v7** (`@clerk/nextjs`).
- `<ClerkProvider>` wraps the app in `app/layout.tsx` — do not move it.
- **Client-side:** use `useAuth()` and `useUser()` from `@clerk/nextjs`.
- **Server-side:** use `auth()` from `@clerk/nextjs/server` in Server Actions and API Routes.
- Protect upload actions server-side by checking `userId` from `auth()` before proceeding.
- Conditional rendering: use `<Show when="signed-in">` / `<Show when="signed-out">` from `@clerk/nextjs`.
- `UserButton` and `SignInButton` are used in `Navbar.tsx` — do not replace with custom auth UI.

---

## 9. File Upload Flow

All files are uploaded to **Vercel Blob** using the client-upload pattern:

```
Client (UploadForm.tsx)
  → upload(filename, file, { handleUploadUrl: '/api/upload' })  [from @vercel/blob/client]
  → POST /api/upload                                             [route.ts]
      → handleUpload() — validates auth via Clerk, returns signed token
  → Vercel Blob CDN (direct upload from client)
  → Returns { url, pathname }
```

- `/api/upload` validates the user is authenticated before returning an upload token.
- Allowed content types: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.
- Files use `addRandomSuffix: true` to avoid key collisions.
- Store both `url` (display) and `pathname`/`blobKey` (future deletion) in the database.

---

## 10. Voice & AI Integration

- **VAPI** manages the real-time voice conversation session. The assistant is pre-configured in the VAPI dashboard and referenced by `NEXT_PUBLIC_ASSISTANT_ID`.
- **ElevenLabs** voice IDs are stored in `voiceOptions` in `lib/constants.ts`. Add new voices there; do not hardcode IDs elsewhere.
- The `persona` field on a `Book` stores the user's chosen voice key (e.g., `"rachel"`), which maps to the ElevenLabs voice ID at session start.
- `VAPI_DASHBOARD_CONFIG` in `lib/constants.ts` is documentation only — these settings are applied in the VAPI dashboard, not sent from the client at runtime.

---

## 11. Adding New Features — Patterns to Follow

### New Page

1. Create `app/(root)/<route>/page.tsx`.
2. Default export a React Server Component.
3. Fetch data directly in the component or call Server Actions.
4. Add the route to `navItems` in `components/Navbar.tsx` if navigation is needed.

### New Server Action

1. Add to `lib/actions/book.actions.ts` or create a new `<domain>.actions.ts` file.
2. Add `'use server'` at the top of the file.
3. Always call `connectToDatabase()` first.
4. Wrap logic in `try/catch` and return `{ success: boolean, data?, error? }`.
5. Use `serializeData()` on any Mongoose documents before returning.

### New Mongoose Model

1. Create `database/models/<name>.model.ts`.
2. Export using the `models.Name || model('Name', schema)` pattern (required for Next.js hot reload).
3. Add the corresponding TypeScript interface to `types.d.ts`.
4. Define compound indexes in the schema file itself.

### New UI Component

1. Place in `components/` if reusable, or co-locate in `app/` if page-specific.
2. Use `cn()` for class merging and reference design tokens from `globals.css`.
3. Add `"use client"` only if the component uses hooks or browser APIs.

---

## 12. Do Not

- Do not call `connectToDatabase()` from client components or API routes — only from Server Actions and Server Components.
- Do not hardcode ElevenLabs voice IDs or VAPI assistant IDs inline — use `lib/constants.ts`.
- Do not use inline `style` attributes for colors defined in brand constants — use CSS variables or Tailwind classes.
- Do not import from `@clerk/nextjs/server` in client components — use `@clerk/nextjs` or `@clerk/react`.
- Do not commit `.env.local` or any file containing API tokens.
- Do not replace `serializeData()` with direct `JSON.stringify()` — it correctly handles the serialization round-trip.
- Do not modify `components/ui/` files to add application-specific logic — create wrapper components instead.
- Do not use `NEXT_PUBLIC_` env vars on the server for sensitive data — they are exposed to the client bundle.

---

## 13. Running the Project

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# -> http://localhost:3000

# Lint
npm run lint

# Build for production
npm run build
```

Ensure `.env.local` is populated with all required variables before starting.

---

## 14. Key File Reference

| File | Purpose |
|---|---|
| `types.d.ts` | All shared TypeScript interfaces |
| `lib/constants.ts` | App-wide constants and config |
| `lib/utils.ts` | Core utility functions |
| `lib/validators.ts` | Zod file validators |
| `lib/actions/book.actions.ts` | Server Actions for book CRUD |
| `database/mongoose.ts` | MongoDB connection singleton |
| `database/models/book.model.ts` | Book model |
| `database/models/book-segment.model.ts` | BookSegment model |
| `database/models/voice-session.model.ts` | VoiceSession model |
| `components/UploadForm.tsx` | Book upload multi-step form |
| `app/api/upload/route.ts` | Vercel Blob upload handler |
| `app/globals.css` | Global CSS, design tokens, utility classes |
| `app/layout.tsx` | Root layout with providers |
| `next.config.ts` | Next.js configuration |

---

## 15. Application Building Context

Read the following files in order before implementing any feature
or making any architectural decision:

1. `context/project-overview.md` — product definition, goals, features, and scope
2. `context/architecture.md` — system structure, boundaries, storage model, and invariants
3. `context/ui-context.md` — theme, colors, typography, and component conventions
4. `context/code-standards.md` — implementation rules and conventions
5. `context/ai-workflow-rules.md` — development workflow, scoping rules, and delivery approach
6. `context/progress-tracker.md` — current phase, completed work, open questions, and next steps

Update `context/progress-tracker.md` after each meaningful implementation change.

If implementation changes the architecture, scope, or standards documented in the context
files, update the relevant file before continuing.
