# Live demo (about five minutes)

Before presenting: run `npm run dev`, open http://localhost:3000, and choose **Settings > Reset demo**. Do one search beforehand so board listings are cached (30 minutes), which makes the live search faster.

The demo student, Jordan Reyes, is **fictional**, and the app says so in the sidebar. Every job shown is a real, currently posted opening, read from the employer's own job board during the demo.

1. **Profile** (Career profile). One evidence library: confirmed bullets, skills with proficiency, and answers to detail questions. Point out that uploaded facts stay marked until the student confirms them.
2. **Discover**. Type: *"Finance or business analyst internships in Dallas or remote"*. Show the editable filters, then search. The progress log is real: boards read, postings scanned, postings verified.
   - If few results are local, the page says how many matching roles are elsewhere. Widen with one click, which is honest scarcity rather than padding.
   - Open a card: verification badge, 3–5 keywords, **Strongest Match** (a real posting line next to a real resume line), the fit factors, and TCU alumni at the company.
3. **Start application**. Requirements are quoted from the posting with coverage labels. Questions ask about gaps. Click *I haven't done this*: it stays off the resume.
4. **Draft**, then **Review** (the core moment).
   - One highlighter color marks changed lines. Click the flagged line: the rule engine shortened "Assisted with reconciling…" to "Reconciled…", and the checker flagged it as claiming more ownership than the original.
   - Edit it to inflate a number ("120 statements"). It's re-checked and blocked as critical.
   - Restore the true wording, confirm, and approve. Approval renders the PDF and reads the text back.
5. **Cover letter**. Visible personalization blanks block approval until filled. Fill one, remove the referral blank, approve.
6. **Export**. Download both PDFs: one page, selectable Times text, no highlights. Click *I've applied*: the status changes and a 7-day follow-up appears on the Overview.
7. **AI log**. Every catch and decision was recorded automatically: the evidence for the "AI was confidently wrong" requirement.
8. **Beyond the minimum** (quick tour): Network (alumni note, outreach draft that never auto-sends), Interview practice (questions from the posting, typed answer, STAR feedback, talking points drawn only from the student's evidence).

## If something fails live

- No network: earlier searches stay on Discover (the last search loads automatically), and a pasted posting works offline.
- Claude unavailable: drafting falls back to the rule engine and says so. Nothing is faked.
- Start over: **Settings > Reset demo**.
