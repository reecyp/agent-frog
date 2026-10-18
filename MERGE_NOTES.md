# AGENT FROG master: how the two versions were merged

Base: **#1 (Job Frog)**. Its data model, server code, prompts, tests and tab layouts are unchanged.
From **#2 (Agent Frog redesign)**: the look (dark walnut palette, lamplight, paper grain, Caslon + Public Sans), the motion, and the flow from the entrance to the home dashboard.

## Flow
| Route | Comes from | Notes |
|---|---|---|
| `/` | #2 entrance | Shop photo, camera push into onboarding |
| `/start` | #2 one-question-per-screen form | Calls #1's upload action; also saves #2's quiz answers (roles, location, job type, arrangement, start, work style, extra note) |
| `/start/questions` | #1 AI follow-up questions | Shown one per screen, #2 style. Pre-populate (demo) is kept |
| `/start/confirm` | #2 "check your profile" step | Uses #1's profile editors; the student can't enter until every item is confirmed |
| `/studio` | #2 Studio home | Boxes: Jobs, Applications, Interview, Network |
| Tabs (`/discover`, `/applications`, …) | #1 layouts + sidebar | Restyled in #2's palette, with the lamplight room, panels that glide in, and page fades |

Onboarding steps stored on `students.onboarding_step`: `questions` → `review` → `done`.

## Left out on purpose (you chose features from #1 only)
#2's Offer comparison, demo seed/controls, and its extra "Questions" application step.

## Running locally
`.env.local` came from #1, so `DATABASE_URL` points at the same Neon database #1 uses. To test without touching it:
`DATABASE_URL= ANTHROPIC_API_KEY= PGLITE_DIR=/tmp/af-test npx next dev`

`scripts/e2e.mts` still opens `/onboarding`, which #1 had already left out of date. Change it to `/start` before you rely on it.
