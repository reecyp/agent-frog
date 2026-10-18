# Architecture

Next.js 16 (App Router, Cache Components), TypeScript, Drizzle ORM on Postgres (Neon or embedded PGlite), the Anthropic SDK, pdf-lib for documents, Motion for interaction.

## Layers

| Layer | Where | Rule |
|---|---|---|
| Domain logic | `src/domain/` | Pure functions, no I/O. Matching, tailoring, claim validation, ATS checks, interview feedback, offer math. Unit-tested. |
| Data access | `src/server/db/` | One schema for Neon and PGlite. `getDb()` picks the driver from `DATABASE_URL`. |
| Services | `src/server/*.ts` | Workflows: search pipeline, application workflow and approval gate, import, alumni adapter. Server-only. |
| AI orchestration | `src/server/ai/` | `structured()` wraps one Claude call with a Zod schema, timeouts, typed errors and refusal fallback. Task prompts live in `/prompts`. |
| Integrations | `src/server/jobs/providers.ts`, `src/server/alumni.ts` | Greenhouse, Lever, Ashby, Adzuna; the private alumni spreadsheet. |
| Documents | `src/server/documents/pdf.ts` | A dedicated renderer for the Neeley template, never a print of dashboard HTML. |
| UI | `src/app/`, `src/components/` | Server Components load data inside `<Suspense>`; client components handle interaction. Mutations are Server Actions in `src/app/**/actions.ts`. |

## The honesty pipeline

1. **Evidence**: the profile is flattened into citable items (`evidenceFrom`): bullets, skills, education, the student's own answers. Each has a status: *extracted* (from an upload), *confirmed* (the student said yes), or *unverified* (excluded).
2. **Requirements**: lines quoted verbatim from the posting (`extractRequirements`). The change summary can only cite these quotes.
3. **Plan**: Claude (or the rule engine) returns bullet text plus the evidence ids it came from. Dates, titles, employers and cities are never taken from the model; they come from the profile.
4. **Validation** (`validate.ts`, deterministic): every line is checked against the evidence it cites:
   - numbers not in the source
   - tools not in the profile
   - stronger ownership ("Assisted with" becoming "Led")
   - a plan restated as a result
   - personal pronouns
   - no source at all
   - unfilled `[[PERSONALIZE: …]]` blanks

   Critical issues make a line *unsupported*; warnings make it *needs review*. A model saying a line is accurate is never accepted as proof.
5. **Review**: the proof sheet highlights every changed line in one yellow. Selecting a line shows what changed, the source, the posting line behind it, and Accept / Edit / Remove. Edits are re-validated.
6. **Approval gate** (`approveDocument`): refuses while any line is unsupported or unconfirmed. It renders the clean PDF from the approved content, extracts its text again, and requires one page and intact reading order.
7. **Export**: `/api/documents/[id]/pdf` returns 403 unless the version is approved. The PDF is rendered fresh, so review annotations can't leak.
8. **AI log**: flags, removals, edits, confirmations and AI failures are written to `ai_events` automatically.

Prompt injection: postings and uploaded documents are wrapped in `<untrusted>` tags, and every prompt states that instructions inside them are data.

## Job discovery pipeline (`src/server/jobs/search.ts`)

1. Interpret: Claude or keyword rules produce editable filters.
2. List every board (in parallel, 8 at a time, 12 s timeout, one retry, 30-minute cache).
3. Filter by title variants, level, location and recency. Postings that only miss on location are counted, so the student can widen the search knowingly.
4. Remove duplicates by company, normalized title and primary location.
5. Read up to 24 postings in full on the employer's board. A successful read is the "live posting" verification; failures are dropped.
6. Extract requirements, assess fit (points with visible factors), find the Strongest Match (a real posting line plus a real evidence line).
7. Save jobs and per-student matches; stream progress events to the browser as NDJSON.

Most banks and large firms use applicant systems without public feeds (Workday, Taleo). Those roles come in through Adzuna or the paste-a-posting flow.

## Data model (`src/server/db/schema.ts`)

`students`, `source_documents` (original file and text, never modified), `education`, `experiences`, `bullets` (with `original_text`), `skills`, `profile_answers` (detail, gap and quiz questions), `jobs`, `job_matches`, `searches`, `applications`, `application_events` (timeline), `documents` (versioned; lines carry provenance in JSON), `ai_events`, `alumni_notes`, `tasks`, `interview_sessions`, `interview_answers`, `offers`.

Each line in a document stores: id, text, original text, source evidence ids, requirement id, transformation, verification, the student's decision and any issues found.

## Privacy

- The alumni spreadsheet is read on the server only (`server-only`). Demographic columns are never read. Email addresses are returned by one POST endpoint, only when the student opens a draft in their own email app, and never rendered, logged or sent to an AI model.
- `.gitignore` excludes spreadsheets, `.env*` and `.data/`. `outputFileTracingExcludes` keeps them out of builds. Both were verified (see VERIFICATION.md).
- Secrets are read only in server modules. Nothing is sent to an external service except posting requests to public job boards and, when configured, Claude and Adzuna.

## Single-user scope

There's no authentication. The active profile is the demo student or a practice profile chosen by a cookie. Every query is scoped to that student id. Add real authentication before deploying for more than one person.
