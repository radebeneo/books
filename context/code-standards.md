# Code Standards

## General

- Keep each module to a single responsibility. A file that parses PDFs does not also
  upload to Blob or write to the database.
- Fix root causes, not symptoms. If a type error appears because a Mongoose document
  is not serialized, add `serializeData()` at the correct boundary — do not cast to
  `any` to silence the error.
- Do not mix unrelated concerns in one component or route. Page components compose
  and display; Server Actions mutate data; utilities are pure functions with no
  side effects.
- Import all paths using the `@/` alias. Relative imports (e.g. `../utils`) are not
  permitted outside of the same directory.
- All new shared TypeScript interfaces and types go in `types.d.ts`. Do not declare
  types inline in component files if they are used in more than one place.

## TypeScript

- Strict mode is enabled in `tsconfig.json` and must remain enabled. Do not add
  `// @ts-ignore` or `// @ts-expect-error` except with an inline comment explaining
  why it is unavoidable.
- Do not use `any`. Use `unknown` and narrow the type, or define an explicit
  interface. The one allowed exception is third-party callbacks that return an
  opaque error value — annotate those as `unknown`.
- Use `z.infer<typeof Schema>` to derive types from Zod schemas. Do not duplicate a
  type definition that can be inferred from an existing Zod schema or Mongoose model.
- Validate all external input at system boundaries before trusting it. File uploads
  are validated by Zod schemas in `lib/validators.ts` on the client and by
  `allowedContentTypes` in `/api/upload` on the server. Both checks must remain in
  place.
- Use `z.instanceof(File)` for file schemas — not `z.any()` — so TypeScript can
  narrow the type in form handlers.
- Prefer narrowly typed function signatures over broad ones. A function that accepts
  `bookId: string` is better than one that accepts `id: unknown`.

## Next.js

- Default to Server Components. Do not add `"use client"` unless the component
  uses browser APIs, React hooks (`useState`, `useEffect`, `useRef`), or event
  handlers.
- All data mutations go through Server Actions (`"use server"`) in `lib/actions/`.
  Do not perform database writes from client components or API routes.
- API routes in `app/api/` are reserved for third-party integrations that require a
  `Request`/`Response` contract. Currently that means Vercel Blob's `handleUpload`
  only. Do not add new API routes for operations that a Server Action can handle.
- `connectToDatabase()` is called only inside Server Actions and Server Components —
  never in client components, API routes, or utility functions.
- Use `next/link` for internal navigation and `next/image` for all images. Do not use
  plain `<a>` tags for internal routes or `<img>` tags for any images.
- New navigable pages go in `app/(root)/`. Add their route to the `navItems` array in
  `components/Navbar.tsx` if they need a navigation link.
- `app/layout.tsx` contains only root providers (`ClerkProvider`), fonts, `Navbar`,
  and `Toaster`. Do not add application logic or page-specific content here.
- `<ClerkProvider>` must remain in `app/layout.tsx` wrapping the entire app. Do not
  nest it inside a route group or move it into a page component.

## Styling

- Tailwind CSS v4 utility classes are the primary styling mechanism. Do not write
  ad-hoc inline `style` props for values that can be expressed as Tailwind utilities
  or CSS variables.
- Custom utility classes (e.g. `.wrapper`, `.library-books-grid`, `.upload-dropzone`,
  `.nav-link-base`) are defined in `app/globals.css`. Check there before creating new
  styles. Add new shared utilities there rather than repeating multi-class combinations
  across components.
- Brand colours have two approved forms:
  - Tailwind classes: use Tailwind opacity modifiers (e.g. `text-[#212a3b]/70`,
    `bg-[#663820]`).
  - Clerk appearance overrides: hardcoded hex strings in `CLERK_AUTH_APPEARANCE_OVERRIDE`
    in `lib/constants.ts` only. Tailwind cannot be used there because it requires
    static class names at build time.
  - Do not introduce a third form. Do not store brand hex values in per-component
    inline styles.
- Conditional class merging always uses `cn()` from `@/lib/utils`. Do not concatenate
  class strings with template literals or the `+` operator.
- Do not use inline `style={}` props for colours, spacing, or sizing that can be
  expressed in Tailwind utilities or CSS custom properties (e.g. `var(--bg-primary)`).
  Inline `style` is only acceptable for values computed at runtime (e.g. a canvas
  width derived from a number).
- Semantic HTML elements are required: `<header>` for the top bar, `<nav>` for
  navigation, `<main>` for page content, `<section>` and `<article>` for content
  regions. Do not use `<div>` where a semantic element is appropriate.

## Forms

- All forms use React Hook Form with a Zod resolver. Do not manage form field state
  with raw `useState`.
- File inputs are registered using `form.setValue(fieldName, file)` inside an
  `onChange` handler. Do not use `register()` directly with file inputs because
  React Hook Form cannot serialize `File` objects.
- Field-level validation errors are shown via `<FormMessage />` from shadcn/ui. Use
  Sonner `toast.error()` and `toast.info()` only for non-field-level feedback (e.g.
  duplicate book detected, network failure).
- Disable the submit button and show a `<LoadingOverlay />` while an async submission
  is in progress to prevent double-submission.
- Always wrap the submission handler in `try/catch/finally`. Set the loading state to
  `false` in `finally`, not at the end of the success path.
- File validation limits (`MAX_FILE_SIZE`, `MAX_IMAGE_SIZE`, `ACCEPTED_PDF_TYPES`,
  `ACCEPTED_IMAGE_TYPES`) must be imported from `lib/constants.ts`. Do not hardcode
  byte values or MIME type strings in validator files or components.

## API Routes

- Authenticate the request using `auth()` from `@clerk/nextjs/server` before
  performing any logic. If `userId` is absent, return HTTP 401 immediately.
- Do not import from `@clerk/nextjs/server` in client components. Use
  `@clerk/nextjs` (or `@clerk/react`) on the client.
- Return consistent response shapes. Success: `NextResponse.json(data)` with status
  200. Auth failure: `NextResponse.json({ error: message }, { status: 401 })`. Catch
  all other errors and return `{ error: message }` with status 500.
- Infer the error message from `e instanceof Error ? e.message : 'Unknown error'`.
  Do not expose raw stack traces or internal error objects to the client.
- API routes handle exactly one concern. `/api/upload` issues Vercel Blob signed
  tokens. It does not write to MongoDB or call any Server Action.

## Data and Storage

- All structured metadata (book title, author, slug, Blob URL references, text
  segments, session records) belongs in MongoDB.
- All binary file content (PDFs, images) belongs in Vercel Blob. MongoDB stores only
  the `url` and `pathname` returned by the Blob upload.
- Call `serializeData()` on every Mongoose document before returning it from a Server
  Action. Never return a raw Mongoose document to a client component.
- New Mongoose models follow the `models.Name || model('Name', schema)` singleton
  pattern. This is required to prevent model redefinition errors during Next.js hot
  reload.
- Define compound indexes inside the schema file, not at migration time. Index
  declarations go at the bottom of the schema file before the model export.
- `generateSlug()` is the canonical function for converting titles to URL-safe
  slugs. Do not write custom slug logic elsewhere. Slug uniqueness is enforced by the
  `unique: true` index on `Book.slug` and the pre-flight `checkBookExists()` call.
- New voice options are added to `voiceOptions` and `voiceCategories` in
  `lib/constants.ts` only. Do not hardcode ElevenLabs voice IDs in components,
  Server Actions, or database models.

## Error Handling

- Server Actions must return `{ success: boolean, data?, error? }`. They must not
  throw unhandled exceptions to the caller. Catch all errors, log them with
  `console.error`, and return `{ success: false, error: e }`.
- When a segment bulk-insert fails, roll back by deleting both the `BookSegment`
  documents and the parent `Book` document before returning the error. Do not leave
  orphaned records in the database.
- Client-side async handlers (e.g. `onSubmit`) use `try/catch/finally`. The `catch`
  block shows a Sonner `toast.error()` and does not re-throw. The `finally` block
  resets the loading state.
- Do not swallow errors silently. Every `catch` block must either log to the console,
  surface a user-facing message, or both.

## File Organization

- `app/(root)/` — Page components only. One file per route. No reusable UI or
  business logic.
- `app/api/` — API route handlers for third-party integrations (`Request`/`Response`
  contract). Currently only `/api/upload/route.ts`.
- `components/` — Reusable UI components used across more than one page. One
  component per file.
- `components/ui/` — Raw shadcn/ui primitives. Generated code. No application-
  specific logic added here.
- `database/models/` — One file per Mongoose model. File is named
  `<entity>.model.ts`.
- `lib/actions/` — All Server Actions. One file per domain (e.g.
  `book.actions.ts`). Every file starts with `'use server'`.
- `lib/constants.ts` — App-wide constants: brand colours, voice config, file limits,
  VAPI and Clerk appearance. No logic, only exported values.
- `lib/utils.ts` — Pure utility functions with no imports from `database/` or
  `lib/actions/`. Side-effect free.
- `lib/validators.ts` — Zod file-input schemas only. References constants from
  `lib/constants.ts` for limits and accepted types.
- `types.d.ts` — All shared TypeScript interfaces. No runtime code. Imported with
  `import type` where possible.
