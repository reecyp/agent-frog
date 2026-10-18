# OfferReady — Project Context

> Living context doc for our Neeley AI Forward hackathon entry (Emerging Track).
> We update this as we brainstorm. When we start building, this is the source of truth.
> Last updated: 2026-10-17

---

## 0. Build rules (always follow)
- **Generated resumes must follow the provided examples/templates exactly.** Use `Neeley_Resume_Template_-_2026.pdf` (and any future examples the team adds) for layout, section order, fonts, and formatting. Don't invent our own resume design.
- Same for cover letters: follow the team's example files once added.
- Never fabricate experience, skills, dates, or qualifications (case rule).
- Keep the alumni data file private (exclude it from git; don't send email addresses to the AI).

---

## 1. The case in one paragraph

Build a tool that helps a TCU student find relevant internships/jobs and turn **one base resume** into applications that fit each role: a tailored resume, a tailored cover letter, and **a clear record of what changed and why**. Judged on real personalization, done honestly, at a pace a busy student can keep up with. No fabrication, ever.

Source: `~/Downloads/03 Emerging OfferReady_Job_Search_Case - Copy.docx`

### Ground rules from the case
- Use a real resume (one of ours) or a realistic stand-in profile + target role.
- Only **publicly viewable** postings (company career pages, public job boards). No logging in to scrape Handshake or paid boards.
- **Never** add experience, skills, dates, or qualifications that aren't true. Allowed: reorder, re-emphasize, reword.
- Outputs must be ATS-parseable: clear section headers, no tables/graphics.

---

## 2. Minimum requirements checklist (what judges will check)

| # | Requirement | Covered by our plan? |
|---|---|---|
| R1 | Shortlist of **real, currently posted** openings from public sources | Yes: Job Research Agent |
| R2 | Per opening: title, company, location, **3–5 key qualifications/keywords** | Partially: need to add to job cards |
| R3 | Per opening: **"Strongest Match"**, the one line a recruiter should see first | **Decided**: on every job card |
| R4 | Tailored resume for **≥3** openings (reorder + reword existing bullets) | Yes: Tailor step |
| R5 | **Show exactly what changed** vs. base resume, **each change tied to a specific line in the posting** | Change Summary (§3e). Must quote posting lines |
| R6 | Tailored cover letter for the same 3, using real posting + real background details | Yes: Tailor step |
| R7 | Cover letter **flags things the student must personalize** (hiring manager name, personal story) | Partly: Verify screen (§3f); still need explicit fill-in flags |
| R8 | **Honesty check**: flag any claim not supported by base resume / student input | Gap follow-up questions (§3c) + Verify & Approve (§3f) |
| R9 | Confirm every output is ATS-parseable | Yes: ATS Checker |
| R10 | **Reusable AI build** (skill file, Claude project, prompt template, or automation) that works on a new profile + role. One-off chat doesn't count. | Need to decide the form |
| R11 | **AI log**: tools, workflow, and ≥1 documented case where AI was confidently wrong + how we caught it | **Not yet** |
| R12 | **Pitch deck + appendix**: shortlist for one sample student, 3 resume/CL pairs with before/after, AI log | Not yet |

**"Go beyond" (where you win):** design for the whole search arc: discover → apply → interview prep → follow up → decide between offers. Tracker, interview practice, habits that turn one good app into five. Talking to real students / Career Services is explicitly rewarded.

---

## 3. Our current flow (v1, updated 2026-10-17)

1. **Upload** resume + Achievement/Experience **master list**
2. **Onboarding quiz** (short, right after upload). See §3a.
3. **AI Deep-Dive questions**: AI reads the resume and asks 4–5 easy follow-up questions. See §3b.
4. **Ask** what they want: Job Type + Industry + Level + Location
5. **Research Job Agent** fires → job cards, each with a **Strongest Match** line
6. User **selects** jobs
7. Per-job **Create** button → **Tailor** fires:
   - **Gap check**: if the posting needs something we don't have info on, the AI **asks the user** before writing. It never fills gaps itself. See §3c.
   - Builds a **brand-new resume on our template** (not an edit of their original). See §3d.
   - Builds the cover letter (draws on the Deep-Dive answers)
   - **ATS check**
   - Writes a **Change Summary**. See §3e.
8. **Verify & Approve screen**: the user reviews and confirms every output is accurate before they can download it. See §3f.
9. **Interview Practice** button → timed, recorded mock interview with AI feedback + story reuse (§3k)
10. **Dashboard** tracks apps, cover letters, statuses + **Network** section (§3j)
- Job cards also show **TCU alumni at that company** → draft email / notes (§3j)

Feature list: job-finding agent · Strongest Match · onboarding quiz + AI deep-dive · gap follow-up questions · template-based resume · cover letter · change summary · ATS checker · user verification · central dashboard.

### 3a-0. Import from LinkedIn profile (proposed 2026-10-17)
- Idea: user gives their LinkedIn profile URL → we read it to fill the master list.
- ⚠️ **Fetching a profile URL from our server mostly won't work**: login wall + bot blocking + LinkedIn terms ban scraping.
- ✅ **Better (official, reliable):** user downloads their own profile and uploads it:
  - **"Save to PDF"** on their LinkedIn profile (Resources / More → Save to PDF): instant, a clean 1–3 page PDF of experience, education, skills, About.
  - Or **LinkedIn data export** (Settings → Data privacy → Get a copy of your data): CSV files of positions, education, skills; may take minutes to arrive by email.
- UX: "Import from LinkedIn" button → 3-step mini-guide with screenshots → drop the PDF → AI pulls it into the master list → user confirms (counts as student-confirmed facts).
- Bonus: comparing LinkedIn vs. resume can surface extra experiences → feeds the onboarding quiz ("Your LinkedIn mentions X but your resume doesn't. Include it?").

### 3a. Onboarding quiz (after resume upload)
Short and quick. Example questions:
- "Any extra experiences you want to include that aren't on your resume?" (clubs, projects, part-time jobs, volunteering)
- **Personality / work-style** questions, used to set the tone of bullets and the cover letter voice (e.g. "Are you more of a leader, a builder, or an analyst?", "How would a teammate describe you?")
- _TBD: exact questions, how many (aim for under 2 min)_

### 3b. AI Deep-Dive questions (4–5 per resume)
- AI reads the resume and writes **4–5 easy questions** that dig deeper into what's already there. Not hard, just ones the user can answer quickly.
  - e.g. "You were treasurer of X. Roughly how big was the budget?" / "What was the outcome of your capstone project?"
- Answers are **saved to the user's profile** as student-confirmed facts and used mainly when building **cover letters** (also usable for bullets and interview prep).

### 3c. Gap follow-up questions (honesty rule)
- When tailoring for a posting, if a needed piece of info is missing (a skill, a number, a tool), the AI **must ask a follow-up question** instead of making something up.
- If the user says "I don't have that", the resume leaves it out. **No invented content, ever.**
- New answers get saved to the profile, so they don't have to be asked again.

### 3d. Template-based resume (no before/after)
- We provide our **own resume template** (ATS-safe: clear headers, no tables/graphics). The AI rebuilds the resume from scratch on it for each job.
- Because it looks completely different from the original, we **skip a visual before/after diff**. The Change Summary does that job instead.

### 3e. Change Summary (per tailored resume)
A short section next to each resume: "key things you should know":
- What was emphasized / moved up and **why**
- Keywords from the posting that were worked in
- What was cut or shortened
- Anything the AI asked about and the user confirmed
- ⚠️ **Requirement R5 note**: the case says each change must be **tied to a specific line in the posting**. Each summary item should quote the posting line it's responding to, e.g. "Led sales of $40K…" ← posting: "track record of driving revenue".
- For the **pitch deck**, we still need a before/after comparison (R12). Easy: original resume on the left, our tailored version on the right, with the Change Summary below.

### 3f. Verify & Approve screen (user responsibility)
- After generation, the user reviews the resume + cover letter and **confirms each item is accurate** (checkboxes per section or per bullet, TBD).
- AI-changed lines are highlighted in faint yellow (§3g).
- Download / "mark as ready" is **locked until they approve**.
- This is the **handoff of responsibility**: we make sure the AI doesn't invent things; the student confirms the final content is true. Worth saying in the pitch.
- The **Highlighted View (§3g)** is what the user reviews on this screen.

### 3g. Two outputs per job: Highlighted View (in-app) + Clean PDF (export)
**1. Highlighted View: in-app only, for review.**
- The resume looks normal. **Only lines the AI changed or added get a faint yellow highlight.** Everything copied straight from the original stays unhighlighted.
- **One color only.** We do not want a multi-colored resume.
- Click / hover a highlighted line → small note:
  - **What changed**: e.g. reworded, moved up, combined, added from your quiz answer
  - **Source**: the original resume line or the quiz / follow-up answer it came from
  - **Why**: the posting line it targets ("← posting: 'experience growing engagement'"). **This covers R5.** The Change Summary (§3e) can be built from these notes.
- From the note the user can **Accept / Edit / Remove**.
- Top of page: "6 lines changed by AI. Review before exporting."
- Cover letter uses the same faint yellow for AI-written specifics, plus visible **[[fill this in]]** blanks (hiring manager, personal story). This covers R7.

**2. Clean Resume: PDF export, ready to submit.**
- On our ATS-safe template, with no highlights, comments, or hidden text. Rendered fresh from the approved content, not by stripping colors off the highlighted view.
- Export happens after the user approves the review (§3f).

**Open:** how to mark the few lines that really need confirmation (an inferred number or skill) without adding a second color. Ideas: a small ⚠️ icon at the end of the line, or a slightly darker yellow. _TBD by team._

**AI log tie-in (R11):** every highlighted line the user Removes or Edits = an AI suggestion that was caught. Count these automatically for the AI log.

### 3h. Job Research Agent design (draft, under discussion)

**Request/response vs. agent**
- Request/response: we send a prompt and get one answer back. The model can't look anything up, so it may invent jobs.
- Agent: same API, but we give the model **tools** (functions our code runs). It runs in a loop:
  `model decides → calls a tool → our code runs it → result goes back to model → repeat → final answer`.
  The model chooses what to search, reads the results, and keeps going until it has a good shortlist.
- Both Claude and OpenAI APIs support this ("tool use" / "function calling"). Concept is the same.

**Agent loop for OfferReady**
1. **Plan**: expand the student's target into search terms (e.g. "supply chain analyst" → "procurement analyst", "logistics intern", "operations analyst intern").
2. **Search**: call job-source tools with those terms + location + level.
3. **Read**: fetch the full posting for promising results.
4. **Verify**: confirm it's real, currently open, and the link works. **Never trust a job the model "remembers."**
5. **Score**: compare each posting to the student profile; pull 3–5 keywords and the **Strongest Match** (with the evidence from both the posting and the profile).
6. **Return**: structured job cards (JSON) → UI.

**Tools to give it**
| Tool | What it does | Notes |
|---|---|---|
| `get_student_profile` | Resume + quiz + deep-dive answers + preferences | Read-only |
| `search_web` | Find postings across public sites | Claude has a built-in web search tool; or use a search API |
| `search_greenhouse` / `search_lever` / `search_ashby` | Pull live postings from a company's public job board | Free, no login, clean JSON. **No global search**: we need a list of company board names to query |
| `fetch_posting(url)` | Get full posting text from a URL | Also used to verify it's live |
| `save_job_card` | Store a finished card (title, company, location, url, date, keywords, strongest match, fit score) | Forces structured output |

**Guardrails**
- Max steps / time limit per search (e.g. ~15 tool calls) so it doesn't loop forever.
- Every card must have a URL that `fetch_posting` successfully read. No URL = no card.
- Strongest Match must quote a real line from the posting + a real line from the profile.
- Cache results; for the live demo, have a pre-run search ready as a fallback.

**UX**
- Show live progress while it works: "Searching Greenhouse… found 34 postings… reading 8… verifying links… 6 matches." Gives the user feedback while it runs and makes a good demo moment.

**AI log tie-in:** log any posting the agent returned that failed verification (dead link, closed role, wrong level).

**Handshake? (researched 2026-10-17)**
- **No official Handshake MCP server.** There are community-built ones (e.g. `sudhxnva/handshake-mcp-server`, `shahparam11/handshake-mcp`), but they work by **logging in as the student** and calling Handshake's undocumented internal API, so they can break without notice.
- **No public job-search API.** Handshake's official EDU API is beta, read-only, and **only for Career Services partners**.
- Third-party scrapers exist (Apify), but they're unofficial and paid.
- ⚠️ The case says: *"Ideally, you should not have to log in to scrape Handshake."* → **Don't use Handshake in the core build.**
- 💡 **Pitch/roadmap idea:** "Phase 2: partner with TCU Career Services to connect through Handshake's official EDU API." That shows we know the real integration path.

**Handshake EDU API: details (researched 2026-10-17)**
- Official, but **only for Career Services partners**. TCU Career Services requests it through their Handshake Relationship Manager + a support ticket; then they get an API key from the developer portal (`edu-api.joinhandshake.com:444`).
- **Read-only**, scoped to one school's data (TCU only), versioned, supports "delta fetching" (only what changed since last pull).
- Endpoints include: **jobs, employers, career fairs, events, appointments, applications, interview schedules, contacts**.
- Handshake says it's "as-is", with no updates planned.
- **We (students) can't get a key ourselves**, so it's not usable for the hackathon build.

**How OfferReady would use it (Phase 2, if TCU partners):**
| Endpoint | Use in OfferReady |
|---|---|
| `jobs` + `employers` | New agent tool `search_handshake_jobs`: postings aimed at TCU students specifically. Strongest source for internships. |
| `career_fairs` + `events` | Nudges: "3 employers on your shortlist are at Thursday's career fair" |
| `interview_schedules` | Feed the Interview Prep feature with real on-campus interview dates |
| `appointments` | "Book a Career Services review" button that sends the annotated PDF ahead of time |
| `applications` | Could auto-update the tracker, but it's **student data** → needs explicit student consent + privacy review (FERPA) |
- Read-only means **we can't submit applications through it**; the student still applies on Handshake.
- Architecture: our server holds TCU's key; the agent calls it like any other tool. Nothing changes in the agent design except one more tool.

**Handshake decision (2026-10-17)**
- Official API: **not available to us** for the build (Career Services-only). Long shot: ask hackathon organizers if TCU Career Services would participate.
- Community MCP servers: **don't use them.** They require the student's Handshake login, use undocumented endpoints, break the case's "don't log in to scrape Handshake" rule, and could break mid-demo.
- ✅ **Instead: "Paste a posting" feature.** The student copies a Handshake (or any) posting's text/link into OfferReady → it goes through the same Strongest Match + Tailor flow. Handshake jobs are covered, the student is in control, no scraping.
- 🔄 **UNDER RECONSIDERATION (2026-10-17):** team is considering using a community Handshake MCP server anyway, going beyond the guideline on purpose. If we do:
  - Run it **locally on the demo laptop with a teammate's own account**. No multi-user login (TCU SSO/2FA + storing students' sessions = security/IT red flag).
  - Make it an **optional "Connect Handshake (beta)" toggle**; public sources stay the default so the core requirements are met without it.
  - **Pre-saved fallback** results in case it breaks live.
  - **Explain the choice openly** in the pitch + AI log (tradeoff, official path = EDU API).
  - **Review the server's code first** (it handles your login session).
  - Risks: Handshake terms of service, judges may mark down, undocumented API can break.
  - **"Connect Handshake" button flow (local demo):** button on site → local backend starts the MCP server's login → real browser window opens → student logs in (TCU SSO/2FA work since it's a real browser) → cookies saved locally → button shows "Connected ✓" → agent gets a `search_handshake_jobs` tool (backend passes calls to the MCP server via the MCP client library) → cards labeled "via Handshake".
  - **To verify by reading the server code:** can login be triggered programmatically (vs. terminal only)? session lifetime? does Handshake block it? do results include full description (needed for Strongest Match)?


### 3i. Where jobs come from + pipeline structure (draft)

**Why not scrape LinkedIn / Indeed / Handshake / Glassdoor**
- Login walls (Handshake, Glassdoor, most of LinkedIn), strong anti-bot protection (CAPTCHAs, IP blocking, Cloudflare), and terms of service that ban scraping. LinkedIn has sued scrapers before (hiQ v. LinkedIn).
- Pages change often → scrapers break → risky live demo.
- Conflicts with the case's "public postings only" rule.

**Use structured sources instead of scraping** (all public; read each provider's terms before use):
| Source | What it is | Notes |
|---|---|---|
| **Greenhouse / Lever / Ashby job board APIs** | Many companies post their careers page through these. They publish public JSON feeds meant to be embedded on other sites. | No key needed. Per-company, so we need a company list. Clean, real, current data. |
| **Aggregator APIs** (e.g. Adzuna, USAJobs, The Muse, JSearch/RapidAPI, SerpApi Google Jobs) | Search across many employers by keyword + location | Usually need a free or paid API key; **check current free tiers + terms**. Some (Google Jobs-based) show postings that originally came from LinkedIn/Indeed, without us scraping those sites. |
| **Claude web search** | Discovery: find companies/postings we didn't know about | Trick: search `site:boards.greenhouse.io "supply chain analyst" Dallas` → then pull clean data from the Greenhouse API |
| **Paste a posting** | Student brings their own (Handshake, LinkedIn, anywhere) | Fully compliant |
| **Company list** | Our curated list of ~50–100 companies (DFW + target industries) and which job board system each uses | One-time setup; grows when web search discovers new ones |


**Recommended source stack (researched 2026-10-17, after dropping Handshake MCP)**
| Layer | Source | Coverage | Limits / notes |
|---|---|---|---|
| 1 | **JSearch** (OpenWeb Ninja, via RapidAPI or direct) | Broadest. Pulls from **Google for Jobs**, which collects listings from LinkedIn, Indeed, Glassdoor, ZipRecruiter, company sites | Free plan: **~200 requests/month**, hard cap (Pro ~$25/mo for 10k). Cache aggressively. |
| 2 | **Adzuna API** | Big aggregator, US endpoint, keyword + location search | Free self-serve key. Reported ~250/day, 2,500/month (from a third party, verify). Must show "Jobs by Adzuna". |
| 3 | **Greenhouse / Lever / Ashby** company boards | Our curated company list; full descriptions | Free, no key, no real limit. Best data quality. |
| 4 | **Claude web search** | Discovery: new companies, career pages, niche roles | Per-search cost via API |
| 5 | **Paste a posting** | Anything the student found (Handshake, LinkedIn, etc.) | Covers Handshake honestly |
| opt | USAJobs API | Government roles | Free key; only if target field fits |

**Getting the most listings from these sources**
- **Expand search terms**: AI turns 1 target into 5–8 title variants ("supply chain analyst" → procurement analyst, logistics coordinator, operations analyst intern…). This is the biggest multiplier.
- **Query all sources in parallel**, then **remove duplicates** (same company + similar title + location).
- **Cache everything** in a local database: never spend JSearch quota twice on the same query. Pre-run searches for the demo student.
- **Expand the company list** as we go: when JSearch/web search finds a company on Greenhouse/Lever/Ashby, add it to the list so future searches get its full board for free.
- Aim: ~100–300 raw postings → filter → ~10–15 shortlist cards. Judges care about **relevance**, not raw count, but showing the raw number makes a good stat ("scanned 240 postings across 5 sources").



**Search UI: decided 2026-10-17**
- **Clickable filters + a describe-it text box.** The user types what they want ("marketing internship at a sports company in DFW next summer, open to hybrid") → a **Filter Mapper** fills in the filters → the user sees the selected filters and can adjust them before searching.
  - Filter Mapper = one AI call with structured output: it only sees the list of available filters + allowed values, and returns which to select. Anything that doesn't fit a filter (e.g. "sports company") becomes an extra search keyword chip. Small and reliable; it doesn't need to be a full agent.
- **Filters:**
  - Job type: Internship / Full-time (both allowed)
  - Timeframe: e.g. Summer 2027, Fall 2027, start-by date
  - Location: city + radius, plus Remote / Hybrid / On-site
  - Visa sponsorship: "Sponsors visas" filter for international students _(confirm)_
  - Industry, level (from original flow)
- **Results:** fit shown as labels **Strong / Good / Stretch**. Unlimited results, **10 per page** with next/prev.
- **Badges on cards:** freshness ("Posted 3 days ago") + verified ("Link checked ✓ today").
- **Scan count** at the top: "Scanned 240 postings from 5 sources → 37 matches."
- **Not doing for now:** "Not interested" feedback.

**Open questions: job agent**
- [ ] Search input: structured form, free-text, or both (form + "anything else?" box)?
- [ ] Internship vs. full-time vs. both? Which term (e.g. Summer 2027)? Grad date?
- [ ] Location: city + radius? Include remote/hybrid?
- [ ] Work authorization / visa sponsorship filter (international students)?
- [ ] Fit display: % score or labels (Strong / Good / Stretch)?
- [ ] How many cards to show (10? 15?), sorted by fit?
- [ ] Should "not interested" feedback refine the next search?
- [ ] Show salary when available?

**High-return, low-risk ideas (proposed)**
1. **One honest gap per card**: next to Strongest Match, e.g. "⚠️ Gap: posting wants Tableau, not on your profile." When they click Create, this leads straight into the gap follow-up questions (§3c). Ties the features together; basically one more field in the AI output.
2. **"Fake entry-level" detector**: flag "entry-level" postings that ask for 3–5+ years. Students hate these; it's one extra check in the Rank step.
3. **Fit labels instead of %**: Strong / Good / Stretch. A label doesn't pretend to precision we don't have, and it's easier to read.
4. **Freshness + verified badges**: "Posted 3 days ago" · "Link checked ✓ today". Builds trust and comes from data we already have.
5. **Editable search chips**: show the expanded titles the AI searched ("procurement analyst", "logistics coordinator"…) as chips the user can remove/add, then re-run. Shows how it searched, gives the user control, and it's cheap.
6. **Source + count summary**: "Scanned 240 postings from 5 sources → 12 matches." A good pitch stat.
7. **"Tailor selected (3)" batch button**: matches the "3 tailored applications" requirement; one click for the demo.
8. **Saved search + "new since last visit"**: rerun daily (cron), and show a badge on the dashboard. Fits the "habit / nudge" part of going beyond; small build.
9. **Demo mode toggle**: serve cached results for the demo student so Wi-Fi/API limits can't break the pitch.

**Pipeline structure: mostly fixed steps, agent where judgment is needed (recommended)**
Instead of one agent free-roaming the internet, use a pipeline: code does the fetching and the AI does the thinking.
1. **Plan (AI)**: turn preferences into search terms + filters (titles, synonyms, level, location).
2. **Fetch (code, in parallel)**: query Greenhouse/Lever/Ashby for companies on our list + 1–2 aggregator APIs.
3. **Filter (code)**: remove duplicates, wrong location, too senior ("5+ years"), postings older than ~30 days.
4. **Rank (AI)**: for the top ~20, read the full posting vs. profile → keywords, Strongest Match, fit score (structured JSON).
5. **Fallback (agent)**: if fewer than ~5 good matches, the agent uses web search to find more companies/postings, then repeats steps 2–4.
6. **Show** job cards with live progress.

Why: faster, cheaper, more predictable demo, and still a real agent (steps 1, 4, 5). Easy to explain in the pitch.

### 3j. TCU Alumni Network (decided 2026-10-17, details in progress)

**Data:** TCU alumni networking Excel file, ~1,000 people: name, current employer, email (+ other columns TBD).

**1. Alumni on job cards**
- When a job's company matches an alum's employer → card shows **"🎓 2 TCU alumni at this company"**.
- Click → list of those alumni (name, title if we have it) with **Draft email** and **📝 Notes** buttons.
- Company matching needs to be **fuzzy** ("Lockheed Martin Aeronautics" = "Lockheed Martin", "AA" = "American Airlines"). AI or a name-normalizing step handles this; precompute once.

**2. Draft outreach email**
- AI drafts a short, personal message using: the alum's company/role, the specific job posting, and the student's real background (honesty rules apply; no made-up connections).
- Includes **[[personalize]]** blanks (e.g. how they found the alum, a specific question).
- **Never auto-sends.** "Copy" or **"Open in email"** (mailto link pre-fills To/Subject/Body in the student's own email app).
- Draft templates by goal: informational coffee chat · ask about the role · referral ask (only after they've connected).

**3. Alumni Notes**
- 📝 icon next to each alum's name → opens that alum's note page.
- Note fields:
  - **Date reached out**
  - **Method** label: Email · Coffee chat · Online call · (maybe also LinkedIn message · Phone · Career fair · Other)
  - **Status** label (proposed): Not contacted · Reached out · Replied · Met · Follow-up needed
  - **Follow-up date** (proposed)
  - **Linked job(s)**: which posting(s) this contact relates to (auto-filled when opened from a job card)
  - Free-text notes
- An alum shows up in the dashboard only **after the first note is saved**.
- Multiple notes per alum over time (a timeline of interactions).

**4. Dashboard → Network section**
- All alumni the student has notes on: name, company, last contact date + method, status, next follow-up.
- Click → full note history for that person.
- Proposed: sort by "follow-up due" + a nudge ("Follow up with Jordan at Deloitte, 7 days since your email").

**Privacy (important: alumni personal data)**
- Confirm **where the file came from and that we're allowed to use it** (e.g. provided by TCU / the competition?).
- **Keep it local / server-side only**. Don't publish it, don't put it in the GitHub repo, don't share it publicly.
- **Don't send alumni emails to the AI.** Only name/company/title are needed for matching + drafting; the email address is added to the mailto link by our code.
- Pitch point: "Real TCU network data, handled responsibly."

**Open questions**
- [ ] Exact columns in the file? (title? grad year? major? LinkedIn URL? city?)
- [ ] Source + permission to use it?
- [ ] Should alumni presence boost a job's ranking, or just be a badge?
- [ ] "Browse alumni by company/industry" outside of job results?
- [ ] Status + follow-up date fields: yes?

### 3k. Interview Practice per job (decided 2026-10-17, details in progress)

**Flow**
1. **"Interview Practice"** button on each job.
2. AI generates questions from: the **job description** + the **student's resume** + **onboarding quiz / Deep-Dive answers**.
3. A question appears on screen with a **~2-minute visual countdown timer** (shows how long they should aim to talk).
4. Answer is **recorded → speech-to-text** transcript.
5. Transcript + question + job + profile go to the AI with a **feedback template** →
   - **Rating** (scale TBD)
   - **Filler word count** ("um", "like", "you know")
   - **STAR breakdown**: Situation / Task / Action / Result. Which parts were strong/missing + talking points to improve
   - General advice
6. Answer is **saved to the database** → becomes context for future practice.
7. **Story reuse across jobs**: AI references past strong answers, e.g. "Your JPMorgan answer about the club budget was strong. Use that story here too."

**Technical notes (Claude)**
- ⚠️ **Many speech-to-text models remove filler words automatically** (cleaned-up transcripts). For a filler counter we need one that keeps them (e.g. Deepgram has a filler-words option; test whichever we pick). Browser speech recognition is free but unreliable.
- Easy extra metrics from the transcript: **speaking pace** (words/min) and **answer length** vs. timer.
- AI provider: the team mentioned ChatGPT; we still need to pick one provider (Claude vs OpenAI) for the whole app.
- Honesty: any "improved sample answer" must use only the student's real facts.

**Decided 2026-10-17**
- **5 questions per session**, a mix of **behavioral + role-specific + "why this company"**. No follow-up questions (for now).
- **No talking time limit.** Instead:
  - **15-second countdown** after the question appears (thinking time) → **microphone turns on automatically**.
  - **Stopwatch** while they talk: shows how long they've been speaking, no limit.
- **Audio only.** Speech-to-text → **save only the transcript** (no audio files stored).
- **Rating: 1–5 in 0.25 steps** (e.g. 3.75, 4.5).
- **Improved answer = ~5 key talking-point bullets** in a set format (not a full paragraph). Real facts only.
- **Speech-to-text must keep filler words** ("um", "uh"); a filler word count is required.
  - Leading option: **Deepgram** with `filler_words=true` (off by default, so we must turn it on). Test "uh-huh"/"mhmm" handling.
  - Other providers: check for a verbatim option before using; Azure has reportedly been hard to configure for this.
- Other metrics (pace, length): **not now**.

**Still open**
- [ ] Tag saved answers by skill (leadership, teamwork, conflict…) + "My Stories" dashboard section?
- [ ] Story reuse across different jobs (e.g. JPMorgan → Deloitte) or same job only?
- [x] AI provider: Claude.
- [ ] Format of the 5 talking-point bullets (e.g. one per STAR part + "tie to the job")?


### 3l. Pre-build checklist (must answer before coding)

**Blockers**
- [ ] **Timeline + team**: submission deadline? hours left? who builds / who does deck + research?
- [x] **AI provider**: Claude API. Still need keys: Anthropic, JSearch, Adzuna, Deepgram.
- [x] **Stack**: TypeScript + Next.js.
- [x] **Local** for now.
- [x] **Accounts**: one pre-populated demo account; onboarding demo data not saved.
- [ ] **Database**: proposed SQLite locally (or hosted Postgres if deployed).
- [ ] **Demo student**: decide while building the site.
- [x] **Resume template**: Neeley 2026 template (in folder). Input formats: PDF + DOCX? (confirm)
- [ ] **Master list format**: an uploaded doc, or a form in the app?
- [ ] **Alumni file**: columns + permission to use.

**Not designed yet**
- [ ] **Cover letter**: team will add example/format files to the folder.
- [x] **Application tracker**: Saved → Applied → Interviewing → Offer / Rejected.
- [ ] **R10 reusable AI build**: proposal: the app's prompts live as clean, documented prompt/skill files in the repo + a standalone Claude Project/skill version.
- [ ] **R11 AI log**: auto-logged catches (§3g) + a team-written log of real mistakes during the build.

**Proposed build order (core first, then go-beyond)**
1. Upload resume → profile (+ quiz + Deep-Dive)
2. Job search: sources → filter → rank → job cards w/ Strongest Match
3. Tailor: gap questions → resume on template → Highlighted View → Clean PDF
4. Cover letter
5. Dashboard: tracker
6. Interview practice
7. Alumni network + notes
8. Polish + demo mode + deck

### 3m. Tech + demo decisions (2026-10-17)

**Stack**
- **Claude API** (Anthropic) for all AI: filter mapper, job ranking, tailoring, cover letters, interview feedback.
- **TypeScript + Next.js**. **Runs locally** for now (no deployment yet).
- Speech-to-text: Deepgram (`filler_words=true`), see §3k.

**Demo account**
- One **demo account pre-populated** with data (profile, saved jobs, tailored resumes, tracker, alumni notes, interview history).
- Must still be able to **show the full onboarding flow live** (upload resume → LinkedIn URL → quiz → Deep-Dive).
- **Data entered during the live onboarding demo is NOT saved** over the demo account. Proposed: onboarding runs in a temporary "practice session" that's thrown away at the end (or a **Reset demo** button restores the seeded data).

**LinkedIn URL in onboarding**
- Team wants a **LinkedIn URL field** in the upload/quiz step so the AI can pull extra info.
- ⚠️ Reality check: fetching a LinkedIn profile from our server usually hits a login wall or gets blocked, so expect it to fail often.
- Plan: **try** (Claude web fetch / web search for public profile info) → if it fails, ask the user to upload LinkedIn's **"Save to PDF"** file (§3a-0). Demo account has LinkedIn data pre-filled, so the demo doesn't depend on it.
- Anything pulled from LinkedIn = shown to the student to confirm before it enters the master list.

**Files in project folder**
- `Neeley_Resume_Template_-_2026.pdf`: **the resume template** (§3d). Structure:
  - Header: **FIRSTNAME LASTNAME** (bold, centered, caps) · phone | email · LinkedIn URL
  - **EDUCATION**: TCU, Neeley School of Business (bold) + city right-aligned · degree + grad month right-aligned · Major/Minor + GPA right-aligned · *Honors/Awards* (optional) · *Relevant Coursework* (only if unique)
  - **EXPERIENCE**: **Employer,** City, State + dates right-aligned · *Job Title* (italic) · 2–3 bullets. Supports multiple titles under one employer with *(dates)*.
  - **LEADERSHIP AND COMMUNITY EXPERIENCE**: **Organization,** City, State + dates · *Your Role* · 2 bullets
  - **SKILLS**: *Technical* (with proficiency) · *Certifications* · *Language* (optional) · *Interests* (optional)
  - Serif font (Times-style), section headers in bold caps with a horizontal rule underneath, one page, single column, no tables/graphics.
  - Generated PDF must be **real selectable text** (not an image) so ATS can read it.
- `Create_Your_Target_Employers_List copy.xlsx`: a **networking tracker template** (headers only, no data). **Not** the 1,000-alumni file. Columns → use as fields for **Alumni Notes** (§3j):
  - Company Name · Contact Name · Contact Email/LinkedIn · How we connected (Handshake, LinkedIn, referral, alum) · Initial Outreach Date · Goals for conversation (2–3) · Meeting date · High-level summary · Personal details from convo · Additional contacts they shared · Job/Internship postings (links) · Date I applied · Timeline for jobs/internships · Sent follow-up email (date) · My next steps · Additional notes
- Coming later: **cover letter examples/format** files.

**Application tracker**: approved as proposed: Saved → Applied → Interviewing → Offer / Rejected.

---

## 4. Claude's suggested additions (proposed, not decided)

These close the gaps in §2 and make the honesty requirement into something we can pitch.

### 4a. "Receipts" view (team chose the Change Summary instead; keep the source-linking idea as a possible stretch)
Every tailored bullet shows:
- **Before** (original bullet) → **After** (tailored bullet)
- **Why**: the exact posting line it's matching (highlighted)
- **Source**: the master-list / resume line that proves it's true

A bullet with no source gets a red **"Unsupported"** flag and can't be exported until fixed. The honesty check stops being a hidden step and becomes something the user can see on every bullet.

### 4b. Turn the quiz into a "Gap Interview" (✅ adopted, see §3b + §3c)
When a posting wants something that isn't in the master list (e.g. "SQL"), the AI **doesn't invent it**. It asks:
> "This posting wants SQL. Have you used it — class, project, job? Tell me in one sentence."

The answer gets added to the master list as a **student-confirmed fact**, so the resume gets better over time and still contains only true claims. This is the quiz with a clear job to do.

### 4c. Job cards with Strongest Match (✅ adopted)
Each card: title · company · location · posted date · source link · 3–5 keywords · **Strongest Match** line · fit score.

### 4d. Cover letter "fill-in" flags (covers R7)
Highlighted `[[PERSONALIZE: ...]]` slots, e.g. hiring manager name, "why this company" story, a detail only the student knows.

### 4e. Self-writing AI log (covers R11)
Every time the honesty check catches an unsupported claim, or the user rejects an AI suggestion, log it automatically. Our "AI was confidently wrong" evidence then comes from the tool itself, and that also makes a good pitch moment.

### 4f. Whole-search features (the "go beyond")
- **Tracker with nudges**: status pipeline (Saved → Applied → Interview → Offer/Rejected), auto follow-up reminder 7–10 days after applying (optionally via Google Calendar).
- **Interview prep per role**: likely questions generated from the posting + STAR answers built from that student's *real* master-list entries.
- **"One good app → five"**: after tailoring one, suggest similar postings that can reuse most of the tailoring.
- **Semester-aware pacing**: e.g. "3 apps this week" goal, sized for a student schedule.
- **Offer comparison** (stretch).

---

## 5. Open questions for the team

- [ ] **Build style**: real web app (code), no-code (e.g. Claude Project + Zapier/n8n), or both? How much coding experience do we have?
- [ ] **Time budget**: how many hours do we have to build vs. polish the deck?
- [ ] **Job sources**: which public sources? (Candidates: Greenhouse / Lever / Ashby public job-board APIs, which need no login and return real live postings; USAJobs API; Adzuna API; web search.)
- [ ] **Sample student**: whose resume + target role do we demo? (Pick a role with lots of public postings, e.g. supply chain analyst, marketing internship, finance analyst.)
- [ ] **Output format**: .docx, PDF, or both? (DOCX is typically the safest for ATS.)
- [ ] **The reusable AI build (R10)**: if we build an app, we also ship the prompts/skill file as a standalone artifact?
- [ ] **User research**: can we talk to 2–3 students + Career Services before the pitch?
- [ ] **Which "go beyond" features** do we actually build vs. just show in the deck?

---

## 6. Decisions log

_(Append as we decide things. Format: date: decision: why)_

- 2026-10-17: Created this context doc.
- 2026-10-17: Every job card shows a **Strongest Match** line.
- 2026-10-17: Resume is **rebuilt from scratch on our own template** rather than edited, so no visual before/after in the app. A **Change Summary** replaces it.
- 2026-10-17: AI **must ask follow-up questions** for missing info. It never fills gaps with made-up content.
- 2026-10-17: **Verify & Approve** screen after generation. The user confirms accuracy, which shifts final responsibility to them.
- 2026-10-17: After upload: a short **onboarding quiz** (extra experiences + personality/work style) plus **4–5 AI Deep-Dive questions** about the resume. Answers are saved to the profile, mainly for cover letters.
- 2026-10-17: **No Handshake integration in the build** (official API is Career Services-only; community MCPs need student logins and break case rules). Add a **Paste a posting** feature instead; Handshake EDU API goes on the Phase 2 roadmap.
- 2026-10-17: **Handshake MCP dropped.** Source stack = JSearch + Adzuna + Greenhouse/Lever/Ashby + web search + Paste a posting (§3i).
- 2026-10-17: **Search UI**: filters + text box with a Filter Mapper AI; Internship/Full-time + timeframe + location filters; Strong/Good/Stretch labels; 10 results per page; freshness + verified badges; scan count. No "not interested" yet.
- 2026-10-17: **TCU Alumni Network** feature: alumni badge on job cards, AI-drafted outreach email (never auto-sent), per-alum notes with date + method labels, Network section in dashboard (§3j).
- 2026-10-17: **Interview Practice per job**: AI questions from job + resume + quiz, 2-min timer, recorded → transcript → AI feedback (rating, filler words, STAR), answers saved and reused across jobs (§3k).
- 2026-10-17: **Interview details**: 5 mixed questions, 15s think countdown then mic auto-starts, stopwatch (no limit), audio→transcript only, 1–5 score in 0.25 steps, ~5 talking-point bullets as improved answer, speech-to-text must keep "um/uh" (Deepgram leading).
- 2026-10-17: **Stack**: Claude API + TypeScript + Next.js, running locally. **Demo account** with pre-populated data; live onboarding demo data is not saved. **LinkedIn URL field** in onboarding (try fetch, fall back to PDF upload). Resume template = Neeley 2026 template. Tracker statuses approved. Alumni Notes fields based on the Target Employers List template (§3m).
- 2026-10-17: **Two outputs per job**: an in-app **Highlighted View** (faint yellow on AI-changed/added lines only, one color, click for source + posting reason) and a **Clean PDF export** to submit. Multi-color tiers were rejected: the team wants only changes highlighted.
- 2026-10-17: **Build started** in `offerready/` (Next.js 16, TypeScript, Drizzle). See `offerready/README.md` and `offerready/docs/`.
- 2026-10-17: **Database: Neon Postgres**, with an embedded Postgres (PGlite) fallback when `DATABASE_URL` isn't set, so the app runs offline with the same schema.
- 2026-10-17: **Honesty check is deterministic** (numbers, tools, ownership verbs, plan-vs-result, no-source, blanks), runs on every line from Claude or the rule engine, and blocks approval. Answers the §3g open question: flagged lines show a "Confirm" or "Fix" tag next to the single yellow highlight, not a second color.
- 2026-10-17: **Rule-based fallback** when no Anthropic key is set: it reorders real bullets and suggests stronger verbs (which the checker flags for confirmation); it never writes new claims. Claude paths are implemented but untested without a key.
- 2026-10-17: **Job sources built**: 79 verified Greenhouse/Lever/Ashby boards + paste-a-posting + optional Adzuna. JSearch and web search not built. Searches report postings that match everything except location, so students widen knowingly.
- 2026-10-17: **LinkedIn: PDF upload only.** The planned "try fetching the URL" step was not built: it would hit a login wall and LinkedIn's terms. The upload guide explains why.
- 2026-10-17: **Interview practice is typed** for now (no speech-to-text key). The 15-second countdown, stopwatch, 1–5 rating in 0.25 steps, STAR breakdown and filler counts are implemented.
- 2026-10-17: **Alumni privacy**: the spreadsheet is read server-side only; demographic columns are never read; emails are fetched only to open a mailto draft the student sends themselves.
