# OfferReady

A recruiting workspace for TCU students, built for the Neeley AI Forward Emerging Track case. One profile, real openings from employers' own job boards, tailored resumes and cover letters where every line traces to the student's evidence, and a tracker for the whole season.

## Run it

Requires Node 24 and npm.

```bash
cd offerready
npm install
cp .env.example .env.local   # optional: every key is optional
npm run dev                  # http://localhost:3000
```

With no keys at all, the app is fully usable:

- **Database**: an embedded Postgres (PGlite) under `.data/`, created and migrated on first request.
- **Drafting**: deterministic, rule-based tailoring that only reorders real bullets and flags any wording you must confirm. It never writes new claims.
- **Jobs**: live public Greenhouse, Lever and Ashby boards for 79 employers. No login, no scraping.
- **Alumni**: read privately from the spreadsheet one folder up (see `ALUMNI_DATA_PATH`).

The app opens as **Jordan Reyes, a fictional demo student**. Settings > Reset demo restores that profile.

### Turn on the optional services

| Service | Set in `.env.local` | What changes |
|---|---|---|
| Claude | `ANTHROPIC_API_KEY` | Resume parsing, search interpretation, reworded bullets, cover letters, detail questions, interview questions and feedback, outreach drafts. Every output still passes the deterministic validator. |
| Neon | `DATABASE_URL`, then `npm run db:migrate` | Data moves from this computer to Neon Postgres. |
| Adzuna | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | Extra aggregator results, always labeled unverified. |

Settings shows what is connected at any moment.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run check` | Type check, lint, unit tests |
| `npm test` | Unit and PDF tests (Vitest) |
| `npm run smoke` | Visits every route at desktop and phone width in headless Chrome; fails on errors or horizontal overflow (needs the dev server running) |
| `npm run db:generate` | New SQL migration after a schema change |
| `npm run db:migrate` | Apply migrations to Neon |
| `npm run probe:boards` | Re-check which employer job boards respond |

Only one server may use a local database folder at a time. To run a second server, give it its own folder: `PGLITE_DIR=.data/pglite-prod npm start`.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): layers, data model, the honesty pipeline, privacy
- [docs/DESIGN.md](docs/DESIGN.md): design system, tokens and materials
- [docs/DEMO.md](docs/DEMO.md): a five-minute live demo script
- [docs/VERIFICATION.md](docs/VERIFICATION.md): what was tested, how, and known limits
- [docs/AI_LOG.md](docs/AI_LOG.md): where the system was confidently wrong during the build, and how it was caught
- [prompts/](prompts/) and [skill/](skill/): the reusable AI build
