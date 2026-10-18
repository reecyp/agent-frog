import { describe, expect, it } from "vitest";
import { countFillers, ruleFeedback, ruleQuestions } from "../interview";
import { evidenceFrom } from "../profile";
import { DEMO_PROFILE } from "./sampleProfile";

const evidence = evidenceFrom(DEMO_PROFILE);

describe("interview practice", () => {
  it("writes five questions mixing behavioral, role and motivation", () => {
    const qs = ruleQuestions({ company: "Gusto", title: "Finance Intern", requirements: [{ id: "r1", quote: "Advanced Excel and financial modeling", keywords: [], kind: "skill", preferred: false }] }, evidence, ["behavioral", "role"]);
    expect(qs).toHaveLength(5);
    expect(new Set(qs.map((q) => q.kind))).toEqual(new Set(["behavioral", "role", "motivation"]));
  });

  it("writes only the chosen types of questions, taking turns between them", () => {
    const job = { company: "Gusto", title: "Finance Intern", requirements: [] };
    const resumeOnly = ruleQuestions(job, evidence, ["resume"]);
    expect(resumeOnly).toHaveLength(5);
    expect(resumeOnly.every((q) => q.kind === "resume")).toBe(true);
    expect(resumeOnly[0].text).toContain("Your resume says");
    const mixed = ruleQuestions(job, evidence, ["role", "resume"]);
    expect(mixed.map((q) => q.kind)).toEqual(["role", "resume", "role", "resume", "role"]);
    expect(new Set(ruleQuestions(job, evidence).map((q) => q.kind))).toEqual(new Set(["behavioral", "motivation", "role", "resume"]));
  });

  it("counts filler words in the typed answer", () => {
    expect(countFillers("Um, so I, like, built the model and, um, you know, it worked")).toEqual({ um: 2, like: 1, "you know": 1 });
  });

  it("rewards a complete STAR answer with a real number", () => {
    const strong = ruleFeedback(
      "Tell me about a time you learned something quickly.",
      "Last summer at my internship I had to take over portfolio reporting when a colleague left. The task was to produce the quarterly report for 40 clients on time. I built Excel models that pulled benchmark data automatically and I asked the advisor to review the first two. As a result we cut preparation from 3 days to 1 and the reports went out early.",
      evidence,
    );
    const weak = ruleFeedback("Tell me about a time you learned something quickly.", "I learn fast and I am a hard worker.", evidence);
    expect(strong.rating).toBeGreaterThan(weak.rating);
    expect(strong.star.result.coverage).toBe("strong");
    expect(weak.star.action.coverage).toBe("missing");
  });

  it("only suggests talking points drawn from the student's evidence", () => {
    const fb = ruleFeedback("Tell me about your Excel modeling.", "I used Excel.", evidence);
    const ids = new Set(evidence.map((e) => e.id));
    for (const t of fb.talkingPoints) for (const id of t.sourceEvidenceIds) expect(ids.has(id)).toBe(true);
    expect(fb.talkingPoints.some((t) => t.text.includes("Built Excel models"))).toBe(true);
  });
});
