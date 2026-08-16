# Books — AI Voice Reading Library

## Overview

Books is a Next.js 16 web application that lets authenticated users build a personal
library of PDF books and have real-time voice conversations with an AI assistant that
has been grounded in each book's content. A user signs in via Clerk, uploads a PDF
(up to 50 MB) with a title, author name, and a chosen ElevenLabs voice persona, and
the app automatically parses the PDF client-side using `pdfjs-dist`, splits the full
text into overlapping 500-word segments stored in MongoDB, and renders the first page
as a cover image uploaded to Vercel Blob. From the book detail page the user can start
a VAPI-powered voice session and speak directly with an AI that answers questions,
summarises chapters, and discusses ideas drawn exclusively from that book's indexed text.

## Goals

1. A signed-in user can upload a PDF book and have it fully indexed (text segments
   stored in MongoDB) within 60 seconds for a 300-page document.
2. A signed-in user can start a voice session on any book they have uploaded and
   receive the first AI response within 3 seconds of speaking.
3. The home page displays the user's personal library as a grid of book cards, each
   showing the cover image derived from the uploaded PDF's first page.
4. Duplicate books (same slug) are detected and rejected before any file upload
   begins, with a user-facing error message shown via Sonner toast.
5. File uploads are rejected client-side with a validation error if the PDF exceeds
   50 MB or the cover image exceeds 10 MB before any network request is made.
6. The application passes `npm run lint` and `npm run build` with zero errors.

## Core User Flow

1. **Land on the home page** — The user opens `https://<domain>/`. The page shows the
   Hero section and a grid of sample book cards. If signed out, a sign-in prompt is
   visible in the Navbar.
2. **Sign in** — The user clicks "Sign In" in the Navbar. A Clerk modal opens. The
   user authenticates with email/password or a social provider. On success the modal
   closes and the Navbar reflects the signed-in state (shows `UserButton`).
3. **Navigate to "Upload Book"** — The user clicks "Upload a Book" (Navbar CTA or
   Hero button), landing on `/books/new`.
4. **Fill in book metadata** — The user enters the book title and author name into the
   React Hook Form / Zod-validated form.
5. **Select a voice persona** — The user picks one of five ElevenLabs voices
   (Dave, Daniel, Chris, Rachel, Sarah) from the voice selector.
6. **Select a PDF file** — The user selects a PDF (≤ 50 MB). The file is validated
   immediately on selection; an error is shown inline if the file is invalid.
7. **Optional: select a cover image** — The user may upload a custom cover (JPEG,
   PNG, or WebP, ≤ 10 MB). If omitted, the app generates the cover from the PDF's
   first page.
8. **Submit the form** — The user clicks "Upload". A full-screen `LoadingOverlay`
   appears.
9. **Duplicate check** — `checkBookExists(title)` is called server-side. If a book
   with the same slug already exists the upload is aborted and a Sonner toast informs
   the user.
10. **Client-side PDF parse** — `parsePDFFile(file)` runs in the browser: all pages
    are extracted as text via `pdfjs-dist`; the first page is rendered to a canvas and
    exported as a PNG data URL (cover).
11. **File upload to Vercel Blob** — The PDF and cover image are uploaded directly
    from the client to Vercel Blob via `/api/upload` (which validates the user's
    Clerk session and returns a signed token). Both `url` and `pathname` (blob key)
    are retained.
12. **Book record created** — `createBook(data)` is called as a Server Action. A
    `Book` document is inserted into MongoDB with the Vercel Blob URLs, file size,
    and voice persona.
13. **Text segments saved** — `saveBookSegments(bookId, clerkId, segments)` bulk-inserts
    all `BookSegment` documents. If the insert fails, both segments and the book record
    are rolled back.
14. **Redirect to book detail** — On success the user is navigated to
    `/books/<slug>`. The `LoadingOverlay` is dismissed.
15. **View book detail** — The book detail page shows the cover, title, author, and
    a "Start Voice Session" button.
16. **Start voice session** — The user clicks "Start Voice Session". The VAPI client
    initialises using `NEXT_PUBLIC_ASSISTANT_ID` and the selected ElevenLabs voice ID.
    A `VoiceSession` document is created in MongoDB.
17. **Converse with the AI** — The user speaks. VAPI handles real-time turn-taking;
    the AI responds using knowledge grounded in the book's indexed text segments.
18. **End the session** — The user clicks "End Session". `endedAt` and
    `durationSeconds` are written to the `VoiceSession` document.

## Features

### Authentication

- Clerk-based sign-in / sign-out via email or social provider
- Clerk `UserButton` in the Navbar for account management
- Server-side auth guard on all upload actions (`auth()` from `@clerk/nextjs/server`)
- Conditional Navbar rendering: sign-in button when signed out, `UserButton` when
  signed in

### Book Library

- Home page grid displaying book cards (cover image, title, author)
- Sample books shown on the public home page using Open Library cover images
- Personal library populated from the signed-in user's MongoDB `Book` documents
- Each card links to the book's detail page via its slug

### Book Upload

- Multi-step upload form with React Hook Form + Zod validation
- PDF file input: validates MIME type (`application/pdf`) and size (≤ 50 MB)
  client-side before any upload
- Optional custom cover image input: validates MIME type and size (≤ 10 MB)
- Voice persona selector grouped by gender (male: Dave, Daniel, Chris;
  female: Rachel, Sarah) with name and description labels
- Duplicate detection by slug before upload begins
- Full-screen `LoadingOverlay` during processing to block interaction

### PDF Processing

- Client-side PDF parsing via `pdfjs-dist` (no server-side PDF dependency)
- Full text extraction across all pages
- Automatic cover generation by rendering PDF page 1 to a 2× canvas and exporting
  as PNG — no separate cover upload required unless the user provides one
- Text split into overlapping segments: 500-word window, 50-word overlap, 0-based
  `segmentIndex`, per-segment `wordCount`

### File Storage

- PDFs and cover images uploaded to Vercel Blob via the client-upload pattern
- `/api/upload` route validates Clerk session before issuing a signed upload token
- Allowed MIME types enforced at the API route level
- `addRandomSuffix: true` prevents key collisions on re-uploads of same filename
- Both `url` (display) and `pathname` (blob key for future deletion) stored in MongoDB

### AI Voice Conversation

- VAPI pre-configured assistant loaded by `NEXT_PUBLIC_ASSISTANT_ID`
- ElevenLabs TTS with five selectable voices; voice ID resolved from
  `voiceOptions` in `lib/constants.ts` at session start
- Voice settings: stability 0.45, similarityBoost 0.75, speed 1.0
- VAPI turn-taking: smart endpointing, 0.4 s wait, background denoising,
  backchanneling enabled
- `VoiceSession` document records `startedAt`, `endedAt`, `durationSeconds`, and
  `billingPeriodStart` per session per user

### Data & Persistence

- MongoDB via Mongoose 9 with a singleton connection cached across Next.js hot
  reloads
- Three models: `Book`, `BookSegment` (text-indexed), `VoiceSession`
- `BookSegment` compound unique index on `{ bookId, segmentIndex }`
- `VoiceSession` index on `{ clerkId, billingPeriodStart }` for usage queries
- `serializeData()` strips Mongoose ObjectIds and Dates before returning data to
  client components

## Scope

### In Scope

- User authentication (sign-in, sign-out, session management) via Clerk
- Book upload form: title, author, PDF file, optional cover image, voice persona
- Client-side PDF parsing: full text extraction and first-page cover rendering
- File upload to Vercel Blob (PDF + cover image)
- MongoDB persistence: `Book` and `BookSegment` documents
- Duplicate book detection by slug
- Book library grid on the home page
- Individual book detail page
- Real-time voice conversation with the VAPI assistant scoped to the book's text
- Voice session tracking (`VoiceSession` model with start/end/duration)
- Five selectable ElevenLabs voice personas
- Sonner toast notifications for upload errors, success, and duplicate warnings
- Responsive UI using Tailwind CSS v4 and shadcn/ui components

### Out of Scope

- Deleting or replacing an uploaded book or its PDF after initial upload
- Editing book metadata (title, author, persona) after creation
- Sharing books or voice sessions with other users
- Public or anonymous book access without authentication
- Server-side PDF parsing or text extraction
- Storing or replaying past voice conversation transcripts
- Search or filtering within the user's book library
- Pagination of the book library grid
- Usage billing or payment integration (billing period tracked but not charged)
- Push notifications or email alerts of any kind
- Mobile native application (iOS / Android)
- Offline support or service worker caching
- Admin dashboard or moderation tools
- Social features: comments, ratings, or book recommendations
- Integration with external e-book sources or APIs (Google Books, Open Library live data)
- Multi-language support or i18n
- Dark mode toggle (design system is fixed via CSS variables)
- Exporting or downloading AI-generated summaries

## Success Criteria

1. A signed-in user can navigate to `/books/new`, complete the upload form with a
   valid PDF and title, submit it, and be redirected to `/books/<slug>` — all within
   one browser session with no console errors.
2. After a successful upload, the book's `Book` document exists in MongoDB with the
   correct `clerkId`, `title`, `slug`, `fileURL`, `coverURL`, and a `totalSegments`
   value greater than 0.
3. Submitting the same PDF title a second time shows a Sonner toast error and does not
   create a duplicate `Book` document in MongoDB.
4. Uploading a PDF larger than 50 MB shows an inline Zod validation error on the file
   field and does not initiate any network request.
5. A signed-in user on a book detail page can click "Start Voice Session", speak a
   question about the book's content, and receive an audible AI response within 3
   seconds.
6. A `VoiceSession` document is written to MongoDB when a session starts, and
   `endedAt` and `durationSeconds` are populated when the user ends the session.
7. The home page renders the signed-in user's uploaded books as cards alongside the
   sample books, each displaying the correct cover image and linking to the correct
   detail page.
8. `npm run build` completes with zero TypeScript errors and zero ESLint errors.
9. An unauthenticated user who submits the upload form directly receives a server-side
   auth error and no `Book` document is created in MongoDB.
10. The Vercel Blob upload API (`/api/upload`) rejects requests from unauthenticated
    users with a non-200 HTTP status before issuing any signed token.
