import { describe, expect, it } from "vitest";
import { DEMO_PROFILE } from "./sampleProfile";
import { evidenceFrom } from "../profile";
import { assembleCoverLetter, assembleResume, ruleCoverLetterPlan, rulePlan, type JobContext } from "../tailor";
import { buildValidationContext, reviewState, revalidate, validateLine, allLines } from "../validate";
import type { DocLine } from "../types";

const evidence = evidenceFrom(DEMO_PROFILE);
const job: JobContext = {
  company: "Example Fintech",
  title: "Finance Intern (Summer 2027)",
  sourceLabel: "Example Fintech careers page (Greenhouse)",
  keywords: ["Excel", "Financial modeling", "Valuation", "SQL", "Python"],
  requirements: [
    { id: "req_1", quote: "Strong proficiency in Excel and financial modeling", keywords: ["Excel", "Financial modeling"], kind: "skill", preferred: false },
    { id: "req_2", quote: "Experience researching companies and valuation multiples", keywords: ["Valuation", "Research"], kind: "experience", preferred: false },
    { id: "req_3", quote: "Familiarity with Python is a plus", keywords: ["Python"], kind: "skill", preferred: true },
  ],
};
const ctx = buildValidationContext(evidence, "resume");

function line(text: string, sources: string[], transformation: DocLine["transformation"] = "reworded") {
  return { text, sourceEvidenceIds: sources, transformation };
}

describe("number extraction", () => {
  it("normalizes money, percents and units without swallowing the next word", async () => {
    const { numbersIn } = await import("../text");
    expect(numbersIn("Reconciled 120 monthly statements")).toEqual(["120"]);
    expect(numbersIn("Managed a $6,200 budget, grew 45% and raised $2M")).toEqual(expect.arrayContaining(["6200", "45%", "2m"]));
    expect(numbersIn("Class of 2027")).toEqual([]);
  });
});

describe("claim validation", () => {
  it("accepts a bullet copied from evidence", () => {
    expect(validateLine(line(DEMO_PROFILE.experiences[0].bullets[0].text, ["b_brazos_1"], "unchanged"), ctx)).toEqual([]);
  });

  it("flags an inflated metric", () => {
    const issues = validateLine(line("Built Excel models tracking 60 client portfolios, cutting report preparation from 3 days to 1", ["b_brazos_1"]), ctx);
    expect(issues.map((i) => i.code)).toContain("number_not_in_evidence");
    expect(issues.find((i) => i.code === "number_not_in_evidence")?.severity).toBe("critical");
  });

  it("flags a software skill the student never claimed", () => {
    const issues = validateLine(line("Built Python models tracking 40 client portfolios", ["b_brazos_1"]), ctx);
    expect(issues.some((i) => i.code === "skill_not_in_evidence" && i.severity === "critical")).toBe(true);
  });

  it("flags ownership escalation from 'Assisted with' to a lead verb", () => {
    const issues = validateLine(line("Reconciled monthly client billing statements in QuickBooks", ["b_brazos_3"]), ctx);
    expect(issues.map((i) => i.code)).toContain("ownership_escalation");
  });

  it("flags a 'Led' claim the source does not support", () => {
    const issues = validateLine(line("Led research on 12 small-cap companies for weekly investment committee meetings", ["b_brazos_2"]), ctx);
    expect(issues.map((i) => i.code)).toContain("ownership_escalation");
  });

  it("flags a planned outcome stated as accomplished", () => {
    const planCtx = buildValidationContext(
      [{ id: "e1", kind: "bullet", text: "Proposed a new filing system expected to save 5 hours a week", status: "confirmed", provenance: "student", context: "x" }],
      "resume",
    );
    const issues = validateLine(line("Created a new filing system that saved 5 hours a week", ["e1"]), planCtx);
    expect(issues.map((i) => i.code)).toContain("outcome_tense");
  });

  it("rejects a line with no source at all", () => {
    const issues = validateLine(line("Managed a $2M portfolio", []), ctx);
    expect(issues[0].code).toBe("no_source");
    expect(issues[0].severity).toBe("critical");
  });

  it("treats unresolved personalization blanks as blockers", () => {
    const issues = validateLine(line("[[PERSONALIZE: why this company]]", [], "generated"), buildValidationContext(evidence, "cover_letter"));
    expect(issues.map((i) => i.code)).toContain("placeholder_unresolved");
  });

  it("does not treat the job title as a skill claim in generated text", () => {
    const c = buildValidationContext(evidence, "cover_letter", ["Data Analyst Intern, Python & SQL", "Acme"]);
    expect(validateLine(line("I am applying for the Data Analyst Intern, Python & SQL position at Acme.", [], "generated"), c)).toEqual([]);
  });

  it("re-validates an edited line", () => {
    const base: DocLine = { id: "l1", text: "Researched 12 small-cap companies", originalText: "", sourceEvidenceIds: ["b_brazos_2"], requirementId: null, transformation: "reworded", verification: "supported", decision: "pending", issues: [] };
    const edited = revalidate({ ...base, text: "Researched 25 small-cap companies", decision: "edited" }, ctx);
    expect(edited.verification).toBe("unsupported");
  });
});

describe("rule-based tailoring", () => {
  const { content, changeSummary } = assembleResume(DEMO_PROFILE, job, rulePlan(DEMO_PROFILE, job), evidence);

  it("keeps employers, titles and dates exactly as in the profile", () => {
    for (const entry of [...content.experience, ...content.leadership]) {
      const src = DEMO_PROFILE.experiences.find((x) => x.id === entry.experienceId)!;
      expect([entry.organization, entry.title, entry.startDate, entry.endDate]).toEqual([src.organization, src.title, src.startDate, src.endDate]);
    }
  });

  it("keeps reverse-chronological entry order", () => {
    expect(content.experience.map((e) => e.experienceId)).toEqual(["exp_brazos", "exp_rec"]);
  });

  it("never introduces a number that isn't in the source evidence", () => {
    for (const l of allLines(content)) expect(l.issues.filter((i) => i.code === "number_not_in_evidence")).toEqual([]);
  });

  it("does not add Python, which the posting wants but the student lacks", () => {
    const text = allLines(content).map((l) => l.text).join(" ");
    expect(text).not.toMatch(/python/i);
    expect(changeSummary.some((c) => c.description.includes("Python") && c.kind === "omitted")).toBe(true);
  });

  it("flags its own verb strengthening for the student to confirm, so it can't export silently", () => {
    const strengthened = allLines(content).find((l) => l.text.startsWith("Reconciled"));
    expect(strengthened?.verification).toBe("needs_review");
    expect(reviewState(content).canApprove).toBe(false);
  });

  it("ties reordered bullets to a verbatim posting line", () => {
    const moved = changeSummary.filter((c) => c.kind === "moved" && c.postingQuote);
    for (const m of moved) expect(job.requirements.map((r) => r.quote)).toContain(m.postingQuote);
  });

  it("approves once the student confirms or removes the flagged line", () => {
    const resolved = { ...content, experience: content.experience.map((e) => ({ ...e, bullets: e.bullets.map((b) => (b.verification === "needs_review" ? revalidate({ ...b, decision: "accepted" }, ctx) : b)) })) };
    expect(reviewState(resolved).canApprove).toBe(true);
  });
});

describe("rule-based cover letter", () => {
  const { content } = assembleCoverLetter(DEMO_PROFILE, job, ruleCoverLetterPlan(DEMO_PROFILE, job), evidence, new Date("2026-10-17T12:00:00"));

  it("follows the Neeley four-part structure", () => {
    expect(content.paragraphs[0].role).toBe("why_them");
    expect(content.paragraphs.at(-1)?.role).toBe("closing");
    expect(content.paragraphs.filter((p) => p.role === "why_you").length).toBeGreaterThanOrEqual(1);
  });

  it("leaves visible personalization blanks and blocks approval until they're filled", () => {
    const state = reviewState(content);
    expect(state.placeholders).toBeGreaterThan(0);
    expect(state.canApprove).toBe(false);
  });

  it("only cites real evidence in the why-you paragraphs", () => {
    for (const p of content.paragraphs.filter((x) => x.role === "why_you")) {
      for (const l of p.lines.filter((x) => x.sourceEvidenceIds.length)) {
        expect(l.issues.filter((i) => i.severity === "critical")).toEqual([]);
      }
    }
  });
});
