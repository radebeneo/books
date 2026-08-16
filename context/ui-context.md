# UI Context

## Theme

Light by default. The design language is a **warm literary**
aesthetic — parchment backgrounds, cream surfaces, and
muted ink tones for text. Interactive elements and CTAs use
a warm brown accent (`#663820`). The app has a `.dark` class
variant defined in CSS but it is not toggled at runtime in
the current build — do not add a dark-mode toggle without
explicit instruction.

---

## Colors

All components must use the CSS custom property tokens below.
Do not use raw hex values except inside Tailwind inline
notation (e.g. `text-[#212a3b]`) when a CSS variable is not
the right tool. Never invent a new color — every color used
anywhere in the app must map to a token in this table.

### Background Tokens

| Role | CSS Variable | Value |
| --- | --- | --- |
| Page background | `--bg-primary` | `#f8f4e9` (warm parchment) |
| Section / card surface | `--bg-secondary` | `#f3e4c7` (warm cream) |
| Subtle accent surface | `--bg-tertiary` | `#fff6e5` (near-white warm) |
| White card | `--bg-card` | `#ffffff` |

### Text Tokens

| Role | CSS Variable | Value |
| --- | --- | --- |
| Primary text | `--text-primary` | `#212a3b` (dark ink) |
| Secondary text | `--text-secondary` | `#3d485e` (medium ink) |
| Muted text | `--text-muted` | `#222c37` (near-black muted) |

### Brand / Accent Tokens

| Role | CSS Variable | Value |
| --- | --- | --- |
| Brand primary (nav, auth, primary buttons) | `--accent-warm` | `#212a3b` |
| Brand primary hover | `--accent-warm-hover` | `#3d485e` |
| Brand accent (CTAs, active states, voice) | `--color-brand` | `#663820` (warm brown) |
| Brand accent hover | `--color-brand-hover` | `#7a4528` |
| Light accent surface | `--accent-light` | `#fff6e5` |

### Semantic / State Tokens

| Role | CSS Variable | Value |
| --- | --- | --- |
| Success | `--success` | `#7c9a82` (muted sage) |
| Warning | `--warning` | `#d4a853` (amber) |
| Destructive / error | `--destructive` | `oklch(0.577 0.245 27.325)` (red) |

### Border Tokens

| Role | CSS Variable | Value |
| --- | --- | --- |
| Subtle border | `--border-subtle` | `rgba(33, 42, 59, 0.12)` |
| Medium border | `--border-medium` | `rgba(33, 42, 59, 0.20)` |

### Shadow Tokens

| Name | CSS Variable | When to use |
| --- | --- | --- |
| Extra small | `--shadow-soft-sm` | Inputs, inline elements |
| Default | `--shadow-soft` | Dropdowns, cards on hover |
| Medium | `--shadow-soft-md` | Raised cards, panels |
| Large | `--shadow-soft-lg` | Modals, overlays |
| Book cover | `--shadow-book` | Book cover images only |

Apply via utility classes `.shadow-soft-sm`, `.shadow-soft`,
`.shadow-soft-md`, `.shadow-soft-lg` — not via inline
`style` props.

---

## Typography

| Role | Font | Variable | Notes |
| --- | --- | --- | --- |
| UI / body | Mona Sans | `--font-mona-sans` → `--font-sans` | Default font for all prose, labels, inputs |
| Display / serif | IBM Plex Serif | `--font-ibm-plex-serif` → `--font-serif` | Page titles, book card titles, CTA buttons, stat values |

Both fonts are loaded via `next/font/google` in
`app/layout.tsx`. Use `font-sans` for body text and
`font-serif` for headings and brand-voice text.

### Type Scale

| Class | Size / Weight | Usage |
| --- | --- | --- |
| `.page-title-xl` | 4xl–5xl / semibold / serif | Primary page `<h1>` |
| `.section-title` | 2xl–30px / semibold / serif | Section `<h2>` |
| `.book-title-lg` | 30px / semibold / serif | Book detail title |
| `.library-hero-title` | 26px–4xl / semibold / serif | Hero `<h1>` |
| `.subtitle` | xl / normal / sans | Page subheadings and descriptions |
| `.form-label` | lg / medium / sans | Form field labels |
| `.book-card-title` | base–xl / bold / serif | Book card heading |
| `.book-card-author` | sm–base / medium / sans | Book card byline |

---

## Border Radius

The base radius is `--radius: 0.625rem` (10px). All
components use multiples of this value. Do not use
Tailwind's default `rounded-*` classes unless they match
the scale below.

| Context | Class / Value | Pixel equivalent |
| --- | --- | --- |
| Inputs, small elements | `rounded-lg` (or `--radius-lg`) | 10px |
| Cards, hero card, voice header | `rounded-[14px]` | 14px |
| Buttons (primary, form) | `rounded-[10px]` | 10px |
| Dropdowns, select content | `rounded-xl` | 12px |
| Modals, overlays, badges | `rounded-2xl` | 16px |
| Circular elements (mic, avatar) | `rounded-full` | 50% |
| Book card cover wrapper | `rounded-[14px]` | 14px |
| Book cover image | `rounded-lg` | 10px |
| Transcript bubbles | `rounded-2xl` | 16px |

---

## Component Library

shadcn/ui on top of Tailwind CSS v4. Components live in
`components/ui/`. Use the CLI (`npx shadcn add <component>`)
to add new primitives — do not write them from scratch.

**Currently installed primitives:**
`button`, `form`, `input`, `label`, `radio-group`, `sonner`

Do not modify files in `components/ui/` directly.
Application-specific styling is done through the CSS utility
classes defined in `app/globals.css`.

---

## Layout Patterns

### Page container

All pages use `.wrapper.container`:
- `.wrapper` — `max-w-7xl px-5 mx-auto w-full`
- `.container` — `pt-[94px] pb-18 min-h-screen` (accounts
  for the fixed 74px navbar + buffer)

### Navbar

Fixed top bar. Height: `74px` (`--navbar-height`).
Background: `var(--bg-primary)`. Contains: logo left,
nav links + auth controls right. Active link uses
`.nav-link-active` (brand underline). Uses `<header>`
as root element.

### Book library grid

```css
.library-books-grid
/* grid-cols-2 → md:3 → lg:4 → xl:5 */
/* gap-x-3 → md:gap-x-10, gap-y-7 → md:gap-y-9 */
```

### Hero card

`.library-hero-card` — `bg-[#f3e4c7] rounded-[14px]`
Three columns on desktop (text | illustration | steps card),
stacked on mobile.

### Book detail / VAPI page

`.book-page-container` — `max-w-7xl px-5 mx-auto w-full pt-20 sm:pt-28 min-h-screen pb-12`

VAPI layout uses `.vapi-main-container` (centered, max-w-4xl)
with `.vapi-card-layout` (flex-col → sm:flex-row, gap-5 → sm:gap-8).

### Upload form

`.new-book-wrapper` — `mx-auto max-w-2xl space-y-6 mt-12 mb-20`
Centered single-column form, max width 2xl (672px).

### Back button (floating)

`.back-btn-floating` — fixed, top-24, left-6, circular
white button with `--shadow-soft` and lift on hover.

### Loading overlay

Full-screen backdrop blur: `fixed inset-0 z-50 bg-black/50 backdrop-blur-sm`

---

## Button Patterns

| Variant | Class | Background | Text | Font |
| --- | --- | --- | --- | --- |
| Primary CTA | `.btn-primary` | `--color-brand` (#663820) | white | IBM Plex Serif |
| Form submit | `.form-btn` | `#663820` → hover `#7a4528` | white | IBM Plex Serif |
| Library CTA | `.library-cta-primary` | white → hover gray-50 | `--text-primary` | IBM Plex Serif |
| Secondary | `.btn-secondary` | white → hover gray-50 | `--text-secondary` | Mona Sans |

All buttons use `rounded-[10px]` and `transition-colors`.
Primary buttons (`.form-btn`, `.btn-primary`) use IBM Plex
Serif. Never mix font families within a button variant.

---

## Upload Dropzone

`.upload-dropzone` — white bg, `rounded-[6px]`, 165px height.
Hover: `bg-gray-50`.
When a file is selected: `.upload-dropzone-uploaded` applies
`bg-[#f3e4c7]` and changes text/hint colour to warm brown.

---

## Voice Selector

`.voice-selector-option` — white card with `--border-subtle`,
`--shadow-soft-sm`. Hover: lifts `translateY(-2px)`.
Selected: `.voice-selector-option-selected` applies
`bg-[var(--accent-light)]` border `--accent-warm`.

---

## Transcript Bubbles

User messages: `.transcript-bubble-user` — `bg-[#663820]`
text white, `rounded-2xl rounded-br-sm`.
AI messages: `.transcript-bubble-assistant` — `bg-[#f3e4c7]`
text `#212a3b`, `rounded-2xl rounded-bl-sm`.
New messages animate in with `animate-in fade-in slide-in-from-bottom-2`.

---

## Icons

Lucide React. Stroke-based icons only.

| Size | Class | Context |
| --- | --- | --- |
| Small inline | `w-4 h-4` | Inline text, volume indicator |
| Standard | `w-5 h-5` (`.icon-sm`) | Buttons, nav items, banners |
| Upload dropzone | `w-[48px] h-[48px]` | File upload icon |

Icon colour always inherits from parent `text-*` class.
Do not set fill on stroke icons.

---

## VAPI Status Indicator Colours

The voice session status dot uses specific Tailwind colours
that are not design tokens — these are intentionally semantic:

| State | Class |
| --- | --- |
| Ready | `bg-gray-400` |
| Connecting | `bg-yellow-500 animate-pulse` |
| Listening | `bg-green-500 animate-pulse` |
| Thinking | `bg-yellow-500 animate-pulse` |
| Speaking | `bg-green-500 animate-pulse` |
