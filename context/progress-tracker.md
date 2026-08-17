# Progress Tracker

Update this file after every meaningful implementation change.

---

## Current Phase

- **Phase 3 of 4 — Book Detail Page** (complete)
- Phase 1 (Foundation) ✅ — Auth, layout, home page, navigation, design system
- Phase 2 (Upload + Indexing) ✅ — Upload form, PDF parsing, Blob upload, MongoDB write, segment indexing
- Phase 3 (Book Detail Page) ✅ — Static detail page with header card, transcript area, back button
- Phase 4 (Voice Session UI) 🔲 — Not started

---

## Current Goal

- Wire up VAPI voice session on the book detail page (Phase 4)
- Install `@vapi-ai/web`, create a client VoiceControls component, integrate mic start/stop and transcript streaming

---

## Completed

- **Root layout** — `app/layout.tsx` with `ClerkProvider`, IBM Plex Serif + Mona Sans fonts, `Navbar`, and `Toaster` wired up
- **Global design system** — `app/globals.css` with CSS variables, brand colour tokens, and all utility classes (`.wrapper`, `.library-books-grid`, `.book-card`, `.upload-dropzone`, `.voice-selector-option`, `.library-hero-card`, `.nav-link-base`, etc.)
- **Navbar** — `components/Navbar.tsx` with active route detection, Clerk `<Show>` conditionals, `UserButton`, `SignInButton`, and `navItems` array (`Library` + `Add New`)
- **Hero section** — `components/Hero.tsx` with responsive illustration, 3-step how-it-works panel, and CTA link to `/books/new`
- **BookCard component** — `components/BookCard.tsx` linking to `/books/<slug>`, renders cover image, title, and author
- **Home page** — `app/(root)/page.tsx` rendering `<Hero>` and a `sampleBooks` grid via `<BookCard>` (static data from `lib/constants.ts`)
- **LoadingOverlay** — `components/LoadingOverlay.tsx` full-screen spinner shown during form submission
- **MongoDB connection** — `database/mongoose.ts` singleton with global cache; throws at import time if `MONGODB_URI` is missing
- **Book model** — `database/models/book.model.ts` with all fields, `unique: true` slug index, `timestamps: true`
- **BookSegment model** — `database/models/book-segment.model.ts` with compound unique index on `{bookId, segmentIndex}`, `{bookId, pageNumber}`, and text index on `content`
- **VoiceSession model** — `database/models/voice-session.model.ts` with compound index on `{clerkId, billingPeriodStart}`
- **Book Server Actions** — `lib/actions/book.actions.ts`: `checkBookExists()`, `createBook()`, `saveBookSegments()` (with rollback on failure), `getBookBySlug()` (fetch single book by slug)
- **Zod file validators** — `lib/validators.ts`: `pdfFileSchema` (PDF, ≤ 50 MB), `coverImageSchema` (JPEG/PNG/WebP, ≤ 10 MB, optional)
- **`lib/utils.ts` utilities** — `cn()`, `serializeData()`, `generateSlug()`, `splitIntoSegments()` (500-word window, 50-word overlap), `parsePDFFile()` (client-side only)
- **`lib/constants.ts`** — brand colours, `sampleBooks`, file limits, `voiceOptions` (5 ElevenLabs voices), `voiceCategories`, `VOICE_SETTINGS`, `VAPI_DASHBOARD_CONFIG`, `CLERK_AUTH_APPEARANCE_OVERRIDE`
- **Vercel Blob upload API** — `app/api/upload/route.ts` using `handleUpload`, validates Clerk session, allows PDF + image MIME types, `addRandomSuffix: true`, returns 401 for unauthenticated requests
- **UploadForm** — `components/UploadForm.tsx` (client component): React Hook Form + Zod, file inputs via `form.setValue()`, voice persona `RadioGroup`, `LoadingOverlay` during submission, full `try/catch/finally`, duplicate check → PDF parse → Blob upload → `createBook` → `saveBookSegments` → redirect to `/` on success
- **Upload page** — `app/(root)/books/new/page.tsx` rendering `<UploadForm>`
- **`types.d.ts`** — `IBook`, `IBookSegment`, `IVoiceSession`, `CreateBook`, `TextSegment`, `BookCardProps`, `BookUploadFormValues`, `VoiceSelectorProps`, `InputFieldProps`, `FileUploadFieldProps`, `ShadowBoxProps`, `Messages`

---

## In Progress

- Nothing currently in progress. Ready to start Phase 4.

---

## Next Up

1. **Voice session UI** — Phase 4
   - Install `@vapi-ai/web`
   - Create client-side `VoiceControls` component: mic start/stop, VAPI session lifecycle
   - Transcript streaming from VAPI message events → update UI in real-time
   - Session writes to `VoiceSession` MongoDB model (startVoiceSession, endVoiceSession Server Actions)
2. **Home page personal library** — Update `app/(root)/page.tsx`
   - Add `getUserBooks(clerkId)` Server Action
   - Show user's uploaded books when signed in; keep sample books for guests
3. **Post-upload redirect** — Update `UploadForm.tsx` line ~135 `router.push('/')` → `router.push(\`/books/${book.data.slug}\`)`

---

## Open Questions

- **Post-upload redirect**: `UploadForm.onSubmit` currently redirects to `/` on success instead of `/books/<slug>`. Should it redirect to the book detail page once that page exists? (Likely yes — update the redirect in `UploadForm.tsx` after the detail page is built.)
- **Home page library**: Should the user's own uploaded books replace the `sampleBooks` grid, or should `sampleBooks` remain visible at all times alongside user books? The current page shows only `sampleBooks` regardless of auth state.
- **`notFound()` behaviour on detail page**: If a user navigates to `/books/a-slug-they-dont-own`, should they see the book (public), a 404, or an auth error? Ownership check strategy is undefined.
- **`VoiceSession.billingPeriodStart`**: This field is required on the model but no logic currently populates it. What value should it receive when a session starts — the start of the current calendar month? The first day of a rolling 30-day window?
- **Voice session actions**: No Server Actions exist yet for `startVoiceSession` or `endVoiceSession`. These need to be added before Phase 4.
- **VAPI SDK**: The VAPI client-side package is not yet installed (`package.json` shows no VAPI dependency). It will need to be added before Phase 4.

---

## Architecture Decisions

- **Client-side PDF parsing** — `parsePDFFile()` uses `pdfjs-dist` and `document.createElement('canvas')`, making it browser-only. It was intentionally placed in `lib/utils.ts` and called only from `UploadForm.tsx`. No server-side PDF processing is used because it would require a Node.js canvas implementation and significantly increase cold-start time.
- **Vercel Blob client-upload pattern** — Files are uploaded directly from the browser to Vercel Blob using a signed token issued by `/api/upload`. This avoids routing large binary files through a Next.js server function and stays within the 4.5 MB Next.js request body limit.
- **Segment rollback on failure** — `saveBookSegments()` deletes all `BookSegment` documents and the parent `Book` document if a bulk insert fails. This keeps MongoDB in a consistent state and avoids orphaned book records with `totalSegments: 0`.
- **Slug-based deduplication** — Book uniqueness is enforced by `generateSlug(title)` + a `unique: true` index on `Book.slug`. A pre-flight `checkBookExists()` call in `UploadForm` catches duplicates before any file is uploaded, saving Blob storage for duplicate submissions.
- **`clerkId` always from server** — `clerkId` is never accepted from the client request body. It is always sourced from `auth()` inside Server Actions or the API route. In `UploadForm`, `userId` from `useAuth()` is passed to `createBook()` only as a client-side guard; the Server Action re-validates auth independently.
- **`serializeData` over `JSON.stringify`** — Mongoose documents returned from queries contain ObjectId and Date types that are not directly serialisable across the Next.js server/client boundary. `serializeData()` does a `JSON.parse(JSON.stringify(data))` round-trip which strips these types consistently. Direct `JSON.stringify` is not used because it does not handle the round-trip back to a plain object.
- **No RBAC** — All authenticated users have identical permissions. Access control is purely ownership-based: every query filters on `clerkId`. There are no admin roles, moderator roles, or collaborator roles in scope.
- **`sampleBooks` are static constants** — The 10 sample books on the home page are hardcoded in `lib/constants.ts` using Open Library cover image URLs. They are not stored in MongoDB. This was a deliberate choice to avoid seeding the database and to keep the home page fast for signed-out visitors.

---

## Session Notes

- The upload pipeline is complete end-to-end. To test: sign in, go to `/books/new`, upload any PDF with a title and voice, submit. The book and segments should appear in MongoDB.
- The post-upload redirect currently goes to `/` (home page). Once the detail page is built, update line 135 in `components/UploadForm.tsx` from `router.push('/')` to `router.push(\`/books/${book.data.slug}\`)`.
- The home page only shows `sampleBooks`. The personal library grid is the first thing to add during Phase 3 cleanup.
- No VAPI npm package is installed. Check the VAPI documentation for the correct package name before starting Phase 4 (`@vapi-ai/web` is the likely candidate).
- `types.d.ts` imports `UploadSchema` from `@/lib/zod` (line 6) but the file is actually `lib/validators.ts`. This import path will cause a TypeScript error — rename the export or update the import before running `npm run build`.
- `components/ui/` contains `button.tsx`, `form.tsx`, `input.tsx`, `label.tsx`, `radio-group.tsx`, and `sonner.tsx`. Do not edit these files directly.
- The context files in `context/` are now fully populated: `project-overview.md`, `architecture.md`, `code-standards.md`, and this file. `ui-context.md` and `ai-workflow-rules.md` still contain template placeholders and should be filled in before starting Phase 3.
