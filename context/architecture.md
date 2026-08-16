# Architecture Context

## Stack

| Layer            | Technology                                      | Role                                                                                                               |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Framework        | Next.js 16 (App Router) + TypeScript 5          | Provides server components, server actions, API routes, and file-based routing. Strict mode enforced.              |
| UI Styling       | Tailwind CSS v4 + `tw-animate-css`              | Utility-first styling. Design tokens and custom utility classes defined in `app/globals.css`.                      |
| Component Kit    | shadcn/ui (Radix UI primitives)                 | Accessible headless components (Button, Form, Input, Label, RadioGroup). Extended via wrapper components only.     |
| Auth             | Clerk (`@clerk/nextjs` v7)                      | Handles sign-in, sign-out, session management, and user identity. Wraps the entire app via `ClerkProvider`.        |
| Database         | MongoDB + Mongoose 9                            | Persistent storage for book metadata, text segments, and voice sessions. Singleton connection cached globally.      |
| File Storage     | Vercel Blob (`@vercel/blob`)                    | Stores uploaded PDFs and cover images. Files are uploaded directly from the client using a signed token flow.      |
| PDF Parsing      | `pdfjs-dist` v5                                 | Client-side only. Extracts full text from all PDF pages and renders page 1 to a canvas for cover generation.      |
| Forms            | React Hook Form + Zod v4                        | Manages upload form state and field-level validation. File schemas defined in `lib/validators.ts`.                 |
| Voice AI         | VAPI                                            | Manages real-time voice sessions. Pre-configured assistant referenced by `NEXT_PUBLIC_ASSISTANT_ID`.               |
| TTS              | ElevenLabs                                      | Provides voice IDs used by the VAPI assistant. Voice options and settings declared in `lib/constants.ts`.          |
| Notifications    | Sonner                                          | Toast notifications for upload success, errors, and duplicate book detection.                                      |
| Icons            | Lucide React                                    | Icon set used across UI components.                                                                                |
| Typography       | IBM Plex Serif + Mona Sans (Google Fonts)       | Loaded via `next/font` in `app/layout.tsx`. IBM Plex Serif for body; Mona Sans for UI chrome.                     |

---

## System Boundaries

| Folder / Path               | Owns                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `app/(root)/`               | Page-level route components. Fetches data via Server Actions. No business logic or reusable UI inside pages. |
| `app/api/`                  | API routes for third-party integrations requiring a `Request`/`Response` contract (Vercel Blob upload only). |
| `app/globals.css`           | Global design tokens, CSS variables, and custom utility classes (`.wrapper`, `.library-books-grid`, etc.).   |
| `app/layout.tsx`            | Root providers: `ClerkProvider`, fonts, `Navbar`, `Toaster`. Nothing else is placed here.                   |
| `components/`               | Reusable page-level UI components (`Navbar`, `Hero`, `BookCard`, `UploadForm`, `LoadingOverlay`).            |
| `components/ui/`            | Raw shadcn/ui primitives. Not modified with application-specific logic. Extended via wrapper components.      |
| `database/mongoose.ts`      | MongoDB connection singleton. Exports `connectToDatabase()`. Called only from Server Actions/Server Components.|
| `database/models/`          | Mongoose schema definitions and model exports. One file per model.                                           |
| `lib/actions/`              | All Server Actions (`"use server"`). Only place where `connectToDatabase()` is called from action handlers.  |
| `lib/constants.ts`          | App-wide constants: brand colours, voice options, file limits, VAPI and Clerk appearance config.             |
| `lib/utils.ts`              | Pure utility functions: `cn()`, `serializeData()`, `generateSlug()`, `splitIntoSegments()`, `parsePDFFile()`.|
| `lib/validators.ts`         | Zod schemas for file inputs (`pdfFileSchema`, `coverImageSchema`).                                           |
| `types.d.ts`                | All shared TypeScript interfaces and types. Single source of truth for global types.                         |

---

## Storage Model

### MongoDB (via Mongoose)

Stores all structured, relational, and searchable data. Nothing that is a raw binary or large file lives here.

| Collection     | What lives here                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `books`        | Book metadata: `clerkId`, `title`, `slug`, `author`, `persona`, `fileURL`, `fileBlobKey`, `coverURL`, `coverBlobKey`, `fileSize`, `totalSegments`. |
| `booksegments` | Chunked PDF text: `clerkId`, `bookId`, `content`, `segmentIndex`, `pageNumber`, `wordCount`. Text-indexed for search.        |
| `voicesessions`| Session records: `clerkId`, `bookId`, `startedAt`, `endedAt`, `durationSeconds`, `billingPeriodStart`.                      |

**Indexes:**
- `BookSegment`: compound unique on `{ bookId, segmentIndex }` + text index on `content`
- `VoiceSession`: compound on `{ clerkId, billingPeriodStart }`

### Vercel Blob

Stores all binary file assets. No metadata or structured data lives here.

| Asset        | Stored as                                                                              |
| ------------ | -------------------------------------------------------------------------------------- |
| PDF file     | Uploaded with `addRandomSuffix: true`. `url` and `pathname` saved in `Book.fileURL` / `Book.fileBlobKey`. |
| Cover image  | Either user-supplied (JPEG/PNG/WebP) or auto-generated PNG from PDF page 1. Saved in `Book.coverURL` / `Book.coverBlobKey`. |

### Client Memory (no persistence)

| Data                        | Where it lives                                              |
| --------------------------- | ----------------------------------------------------------- |
| PDF `ArrayBuffer`           | In-memory during `parsePDFFile()` call only                |
| Cover PNG data URL          | In-memory string during upload; discarded after Blob upload |
| Form field values           | React Hook Form controller state; cleared on navigate       |

### No Cache Layer

There is no Redis, in-memory cache, or CDN edge cache configured in the application layer. Vercel Blob's CDN handles static asset delivery automatically.

---

## Auth and Access Model

**Authentication**
- All authentication is handled by Clerk v7. No custom auth code exists.
- `<ClerkProvider>` wraps the entire app in `app/layout.tsx`. It must not be moved or nested inside a route group.
- Client components use `useAuth()` and `useUser()` from `@clerk/nextjs`.
- Server Actions and API routes use `auth()` from `@clerk/nextjs/server` to obtain `userId`.

**Ownership**
- Every `Book`, `BookSegment`, and `VoiceSession` document carries the `clerkId` of the user who created it.
- `clerkId` is written at creation time from the server-side `auth()` call; it is never accepted from the client request body.
- A user can only read and interact with documents where `clerkId` matches their own Clerk user ID.

**Access Control**
- The upload form page (`/books/new`) is accessible to any visitor, but the Server Action `createBook` and the API route `/api/upload` reject unauthenticated requests before performing any write.
- `/api/upload` returns HTTP 401 before issuing a Vercel Blob signed token if the Clerk session is absent.
- Server Actions return `{ success: false }` and log an error — they do not throw unhandled exceptions to the client — when auth fails.
- There is no role-based access control (RBAC). All authenticated users have identical permissions scoped to their own data.

---

## AI and Voice Session Model

**VAPI (Voice AI)**
- The VAPI assistant is pre-configured in the VAPI dashboard and referenced client-side only via `NEXT_PUBLIC_ASSISTANT_ID`.
- No VAPI configuration is sent from the client at runtime. Turn-taking and model settings are managed in the dashboard (documented in `VAPI_DASHBOARD_CONFIG` in `lib/constants.ts`).
- The VAPI SDK is initialised in the browser at session start. There is no VAPI server-side integration.

**ElevenLabs (TTS)**
- Voice IDs are stored in `voiceOptions` in `lib/constants.ts`. New voices must be added there; IDs must never be hardcoded elsewhere.
- The selected voice key (e.g. `"rachel"`) is stored in `Book.persona`. The ElevenLabs voice ID is resolved from `voiceOptions` at session start.
- TTS settings (stability, similarityBoost, speed) are centralised in `VOICE_SETTINGS` in `lib/constants.ts`.

**No Background Jobs**
- There are no background workers, queues, cron jobs, or long-running processes. All processing (PDF parse, segment split) happens synchronously in the browser during form submission.

---

## Invariants

These rules must never be violated regardless of feature additions or refactoring.

1. **`connectToDatabase()` is called only in Server Actions and Server Components — never in client components or API routes.**
   The Mongoose module reads `MONGODB_URI` at import time and throws if it is absent. Importing it in a client component would crash the client bundle. API routes use `@vercel/blob` and Clerk only.

2. **`clerkId` on every database document is always set server-side from `auth()` — it is never taken from the client request body.**
   Accepting `clerkId` from the client would allow any authenticated user to write documents owned by another user. The server must always source `clerkId` from the verified Clerk session.

3. **ElevenLabs voice IDs and the VAPI assistant ID are never hardcoded inline — they must come from `lib/constants.ts` or environment variables.**
   Hardcoding IDs in components makes them invisible to future audits, breaks the single-source-of-truth for voice config, and risks leaking production values in version control.

4. **`parsePDFFile()` is called only in client components — never in Server Actions, Server Components, or API routes.**
   The function uses `document.createElement('canvas')`, which is a browser-only API. Calling it server-side throws a runtime error. PDF parsing is intentionally a client-side responsibility.

5. **`serializeData()` must be called on every Mongoose document before it is returned from a Server Action to a client component.**
   Mongoose documents contain non-serialisable types (ObjectId, Date, internal prototype chains). Passing them directly across the server/client boundary causes Next.js serialisation errors. `JSON.stringify` alone is not a substitute — `serializeData()` handles the full round-trip.

6. **No file content (PDF binary, canvas data URL) is sent to MongoDB — only Vercel Blob URLs and metadata are stored.**
   MongoDB documents have a 16 MB size limit. Storing binary data in MongoDB would exhaust document limits, degrade query performance, and conflate the storage responsibilities of the two backends. Binary assets belong in Vercel Blob; structured references belong in MongoDB.

7. **`components/ui/` files are not modified with application-specific logic.**
   shadcn/ui primitives are generated code and may be re-generated by `npx shadcn`. Application-specific behaviour must be added in wrapper components in `components/`, not inside `components/ui/`.

8. **`NEXT_PUBLIC_` environment variables are never used for secrets.**
   Variables prefixed with `NEXT_PUBLIC_` are inlined into the client bundle at build time and are publicly visible. Only the VAPI assistant ID (`NEXT_PUBLIC_ASSISTANT_ID`) — which is a non-secret reference — uses this prefix. API tokens (`BLOB_READ_WRITE_TOKEN`, `CLERK_SECRET_KEY`, `MONGODB_URI`) must remain server-only.
