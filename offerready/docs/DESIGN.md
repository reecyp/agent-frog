# Design system: "Crisp & light"

## Concept

Cool white surfaces, one sans family, TCU purple as the single accent. The chrome is calm and quiet so content leads. Resting content sits on hairline borders; only things that float (menus, dialogs, toasts, the resume sheet) cast a shadow.

The one bold element is the **proof sheet**: the tailored resume in the Neeley template's typography, with each AI-changed line marked by a single highlighter yellow and a margin note explaining it. Everything around it stays quiet.

Deliberately avoided: beige/cream backgrounds, grain, serif display titles, a dark nav rail, identical rounded cards with the same soft shadow, gradient washes, ALL-CAPS tracked eyebrows, `→` on buttons, mono for small labels, 01/02/03 numbering on non-sequences. Prefer lists with hairline dividers over stacks of cards.

## Tokens (`src/app/globals.css`)

| Token | Value | Role |
|---|---|---|
| `--bg` | `#FFFFFF` | Main content background |
| `--bg-subtle` | `#F7F6FA` | Sidebar, wells, table headers, hover rows |
| `--bg-muted` | `#EFEDF4` | Pressed/selected neutral, chips, skeletons, segmented track |
| `--line` | `#E4E1EB` | Hairline borders and dividers |
| `--line-strong` | `#CDC8D8` | Input and secondary-button borders, emphasized dividers |
| `--ink` | `#17151C` | Primary text |
| `--ink-2` | `#4A4655` | Secondary text |
| `--ink-3` | `#686474` | Muted text, placeholders |
| `--accent` | `#4D1979` | TCU purple: primary buttons, active nav, links, focus ring |
| `--accent-hover` | `#3E1263` | Primary hover |
| `--accent-soft` | `#F2ECF9` | Active nav background, selected states, accent badges |
| `--on-accent` | `#FFFFFF` | Text on accent |
| `--mark` / `--mark-edge` | `#FFF0A3` / `#E3C94A` | Highlighter: AI-changed lines only |
| `--ok` / `--ok-soft` | `#2F6B3F` / `#E7F3EA` | Success (always with icon/words) |
| `--caution` / `--caution-soft` | `#7A5000` / `#FCF1D8` | Warning |
| `--danger` / `--danger-soft` | `#A3322B` / `#FCEAE7` | Error, destructive |

Tailwind theme colors exist for all of them (`bg-bg-subtle`, `text-ink-2`, `border-line`, `bg-accent-soft`, …), plus `rounded-control` / `rounded-panel` / `rounded-sheet`. `var(--token)` in arbitrary values works equally well.

### Measured contrast (WCAG AA: 4.5:1 for text)

| Pair | Ratio |
|---|---|
| ink on bg / bg-subtle | 18.10 / 16.82 |
| ink-2 on bg / bg-subtle / bg-muted | 9.14 / 8.49 / 7.87 |
| ink-3 on bg / bg-subtle / bg-muted | 5.73 / 5.33 / 4.94 |
| accent on bg / bg-subtle / accent-soft | 12.13 / 11.28 / 10.48 |
| on-accent on accent / accent-hover | 12.13 / 14.27 |
| ok on ok-soft | 5.58 |
| caution on caution-soft | 6.29 |
| danger on danger-soft / bg | 5.93 / 6.89 |
| document text (#111) on the highlighter | 16.41 |
| tooltip (white on ink) | 18.10 |

`--line-strong` on white is 1.63:1. Input boundaries are not required to meet 3:1 when they carry a visible label, but don't rely on a border alone to say something is interactive.

## Type

| Role | Face | Class | Size |
|---|---|---|---|
| Page title | Instrument Sans 600, −0.02em, lh 1.15 | `.t-title` | `clamp(1.5rem, …, 1.75rem)` |
| Section head | Instrument Sans 600 | `.t-section` | 1.25rem |
| Card/row title | Instrument Sans 600 | `.t-card` | 1.0625rem |
| Body | Instrument Sans 400, lh 1.5 | `.t-body` / default | 0.9375rem (15px) |
| Secondary | ink-2 | `.t-secondary` | 0.875rem |
| Field label | 600, ink-2 | `.t-label` | 0.8125rem |
| Meta | ink-3 | `.t-meta` | 0.8125rem |
| Counts | tabular numerals | `.t-num` | — |
| Code/IDs only | IBM Plex Mono | `.t-mono` | 0.75rem |
| Documents | Times New Roman | `.doc` | 14.5px (Neeley template) |

Sentence case everywhere. Prose stays within 75ch (`.measure`). Both web fonts are SIL OFL, self-hosted by `next/font` (`--font-instrument-sans`, `--font-plex-mono`).

## Radius and elevation

- Radius by role: controls 8px (`--r-control`), panels/containers 12px (`--r-panel`), the document sheet 2px (`--r-sheet`), pills full (`--r-pill`).
- No shadow on resting content: use a `--line` border.
- `--shadow-pop`: menus, popovers, tooltips (`.popover`).
- `--shadow-float`: dialogs, toasts, the mobile drawer, floating bars (`.floating`).
- `--shadow-sheet`: the resume sheet only (`.sheet`).

## Shared classes

| Class | Use |
|---|---|
| `.panel` | White container, `--line` border, 12px radius |
| `.list` + `.list-row` | Bordered list whose direct children get hairline dividers; preferred over card stacks |
| `.subtle` | Recessed `--bg-subtle` area (wells, kanban columns) |
| `.popover` / `.floating` | Floating surfaces |
| `.btn` + `.btn-primary` / `.btn-secondary` / `.btn-quiet` / `.btn-danger`, `.btn-sm`, `.btn-icon` | Buttons. 40px tall (36px `sm`, 40px on coarse pointers) |
| `.field`, `.input` (input/select/textarea) | Form fields; focus = accent border + 1px ring; `aria-invalid` turns danger |
| `.segmented` + `.thumb` | Segmented control (white thumb on muted track) |
| `.chip` | Removable filter chip |
| `.badge` + `-ok` / `-caution` / `-danger` / `-neutral` / `-accent` | Status pills, always with words or an icon |
| `.skeleton` | Loading shimmer (static under reduced motion) |
| `.scroll-x` | Horizontal scroll with hidden scrollbar |
| `.rule` | 1px divider |
| `.doc*` | The proof sheet (unchanged behavior) |

## Components (`src/components/ui`)

- `PageHeader({ title, lede?, actions?, tabs? })`: title + lede, actions wrap below the title when the content container is under `@2xl` (42rem). `tabs` renders beneath.
- `SectionTabs({ group? | items?, current, label?, className? })`: route tabs (`<Link>`, `aria-current="page"`, 2px accent underline, horizontal scroll). Groups in `SECTION_TABS`: `applications` (Applications | Follow-ups), `profile` (Career profile | Detail questions), `settings` (Settings | AI log). Server-safe: the page passes its own href as `current`.
  ```tsx
  <PageHeader title="Follow-ups" tabs={<SectionTabs group="applications" current="/follow-ups" />} />
  ```
- `Section({ title, description?, aside?, className? })`, `EmptyState({ title, body, action?, icon? })`, `ErrorNote`, `Skeleton`, `ListSkeleton`, `TextLink`, `formatDate`.
- `Dialog` (native `<dialog>`, `.floating`), `Toast` (white, `.floating`), `ActionButton`.

## Navigation (`src/components/shell`)

Primary: Home `/`, Jobs `/discover` (+ `/jobs/*`), Applications `/applications` (+ `/follow-ups`), Interview `/interview`, Network `/network`.
Secondary (bottom): Profile `/profile` (+ `/profile/questions`), Settings `/settings` (+ `/ai-log`).
Account block at the very bottom: initials, name and the real connection status (AI drafting, database), linking to Settings.

| Viewport | Shell |
|---|---|
| < 768px | Sticky 56px top bar (logo + menu button), slide-in drawer (Escape and route change close it) |
| 768–1279px | 72px rail on `--bg-subtle`: primary items as icon over an 11px label; secondary items icon-only with tooltip + `aria-label`; account as an initials avatar with a status dot and tooltip |
| ≥ 1280px | 240px sidebar, icon beside label, full account block |

Active item: `--accent-soft` background, accent text, animated with a shared-layout spring (honors reduced motion via `MotionConfig`). Skip link is first in the tab order. `(start)` onboarding has its own layout: a hairline-bordered top bar with the mark and a centered 44rem column.

## Responsive rules

- `main` is a Tailwind `@container`. **Lay out pages by container width**, not viewport: `@3xl:grid-cols-[minmax(0,1fr)_20rem]` etc. Container sizes: `@xl` 36rem, `@2xl` 42rem, `@3xl` 48rem, `@4xl` 56rem, `@5xl` 64rem.
- Content max width 72rem (`--page-max`), centered, side padding `clamp(1rem, 3vw, 2.5rem)` (`--page-gutter`).
- Every grid/flex child holding text gets `min-w-0`; long names `break-words`.
- Wide tables and the resume sheet scroll inside their own container, never the page.
- Action groups `flex-wrap gap-2`; on narrow containers, card actions move below the content.
- Fixed bottom bars should offset by `--shell-offset` (0 / 72px / 240px by viewport) to center on the content area.
- Touch targets ≥ 40px. Verify no horizontal overflow at 390, 800 and 1440.

## Motion (`src/components/motion.ts`)

120ms feedback, 200ms state changes, 320ms rare larger moves; exits faster than entrances. A no-bounce spring for sliding indicators. Motion only answers an action (nav indicator, segmented thumbs, dialogs, toasts, drawer). `MotionConfig reducedMotion="user"` plus a CSS rule that removes transitions/animations and freezes skeletons.

## Accessibility floor

2px accent focus ring with 2px offset on everything (`:focus-visible`); skip link; labels on every field; status never color-only; live regions for progress and toasts; native elements wherever possible.

## Shared patterns

- `.segmented` works with `<button>`s (with a `.thumb`) or with `<Link>`s marked `aria-current`.
- `.list` rows that set their own background keep the list's rounded corners automatically.
- The old desk/paper/instrument names (`--paper`, `.instrument`, `--ledger`, `--frog`, `.well`, `.engraved`, Newsreader) were removed after every component migrated. Use the tokens above.
