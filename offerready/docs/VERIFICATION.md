# Verification

Everything below was run on 2026-10-17 on Windows 11, Node 24, and the installed Google Chrome in headless mode. Commands are reproducible.

## Automated

| Check | Command | Result |
|---|---|---|
| Types | `npm run typecheck` | Pass |
| Lint | `npm run lint` | Pass (0 problems) |
| Unit and document tests | `npm test` | 47 tests in 7 files pass |
| Production build | `npm run build` | Pass. One Turbopack warning about whole-project tracing from the alumni file read (see Privacy). |
| Route smoke test, dev and production | `npm run smoke` | All 14 routes pass at 1366 px and 390 px: expected status, no console or page errors, no horizontal overflow |
| End-to-end workflows | `npm run e2e -- path/to/resume.pdf` | 11 of 11 checks pass |

### What the tests cover

- **Honesty**: inflated metrics, unsupported tools, "Assisted" becoming "Led" or "Reconciled", a plan stated as a result, lines with no source, unfilled blanks, edits re-validated, approval blocked until resolved.
- **Tailoring**: employers, titles and dates are never altered; reverse-chronological order is kept; missing posting skills are left out and recorded in the change summary; moved lines cite verbatim posting quotes.
- **Discovery**: requirements quoted verbatim; required, preferred and benefits sections told apart; Greenhouse's escaped HTML decoded; "International" is not "Intern"; duplicates collapse; level and location filters work; the Strongest Match cites a real posting line and a real profile line; fit points add up to their factors.
- **Documents**: the resume renders to one page of real text, and extracts in order with whole lines. Removed lines and annotations never appear in the PDF. ATS format checks pass. The rule parser round-trips a Neeley-format PDF.
- **Interview**: question mix, filler-word counts, STAR scoring, talking points drawn only from evidence.

## Manual and end-to-end (with real data)

- A real search scanned 18,244 postings across 79 employer boards. 24 were read in full and verified live. Nothing came from model memory.
- The full flow on a real Gusto Finance Intern posting: start application, decline a gap question, draft, the flagged "Reconciled" line, an edit inflating a number caught as critical, edit back, approve. Then the cover letter: blanks blocked approval until filled or removed, then approved. Both PDFs downloaded and checked with an independent parser (pypdf): one page each, no annotations leaked. Downloading an unapproved document returns 403.
- Privacy: no alumni email in any rendered page (checked by regex on network search and contact pages). The email endpoint refuses GET and malformed keys. No spreadsheet or local database file appears in the build's trace files or `.next`. The spreadsheet is git-ignored (`git check-ignore`).
- Contrast for every token pair measured (see DESIGN.md); all meet WCAG AA.

## Not verified, and why

- **Claude**: no `ANTHROPIC_API_KEY` was available, so every Claude path is untested against the live API. The code follows the installed SDK's documented `beta.messages.parse` and `zodOutputFormat` APIs and type-checks. Every Claude output passes the same deterministic validator as the rule engine, and failures fall back to rules with a visible note.
- **Neon**: no `DATABASE_URL` was available. The same Drizzle schema and migrations run on PGlite (a real Postgres). `npm run db:migrate` targets Neon over HTTP.
- **Adzuna**: no keys. The adapter follows Adzuna's documented search endpoint, and its results are always labeled unverified.
- **Voice recording**: not built. It needs a speech-to-text service that keeps filler words, such as Deepgram. Practice is typed.
- **Screen reader pass**: structure, labels, live regions and focus were built and checked in code, but not tested with NVDA or VoiceOver.

## Known limitations

- Single-user and local, with no authentication. Add authentication before deploying for others.
- Few DFW-area finance internships are on public ATS feeds; many banks and large firms use Workday or Taleo, which have no public API. Paste-a-posting and Adzuna cover them.
- The rule-based tailor reorders and lightly rewords; real rewording needs the Claude key.
- Reminders are in-app only; nothing is emailed or pushed.
