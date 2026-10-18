import { describe, expect, it } from "vitest";
import { DEMO_PROFILE } from "./sampleProfile";
import { evidenceFrom, type ProfileSnapshot } from "../profile";
import { assembleResume, type JobContext, type TailorPlan } from "../tailor";
import { displayDate, mergeDuplicateExperiences, monthKey, sameExperience, similarBullets } from "../experiences";

type Exp = ProfileSnapshot["experiences"][number];
const exp = (id: string, organization: string, title: string, startDate: string, endDate: string, bullets: string[], sortOrder = 0, section: Exp["section"] = "experience"): Exp => ({
  id, section, organization, city: "Fort Worth, TX", title, startDate, endDate, status: "confirmed", provenance: "demo", sortOrder,
  bullets: bullets.map((text, i) => ({ id: `${id}_b${i}`, text, originalText: text, status: "confirmed", provenance: "demo", sortOrder: i })),
});
const job: JobContext = { company: "Example", title: "Finance Intern", sourceLabel: "Example careers page", keywords: [], requirements: [] };

describe("recognizing the same job imported twice", () => {
  it("reads dates the way resumes and LinkedIn write them", () => {
    expect(monthKey("January/2026")).toBe("2026-01");
    expect(monthKey("Jan 2026")).toBe("2026-01");
    expect(monthKey("01/2026")).toBe("2026-01");
    expect(monthKey("Present")).toBe("present");
    expect(displayDate("January/2026")).toBe("January 2026");
  });

  it("matches a job whose employer is named differently when the dates agree", () => {
    expect(sameExperience(
      { organization: "Nicolo's Pizza", title: "Food Server", startDate: "June 2022", endDate: "August 2026" },
      { organization: "Nicolo’s Italian", title: "Server/Host/Delivery", startDate: "June/2022", endDate: "August/2026" },
    )).toBe(true);
    expect(sameExperience(
      { organization: "TCU Football Player Personnel", title: "Player Personnel Assistant Analyst for Linebackers", startDate: "January/2026", endDate: "May/2026" },
      { organization: "Texas Christian University football", title: "Player personnel analyst", startDate: "January 2026", endDate: "May 2026" },
    )).toBe(true);
  });

  it("keeps different jobs apart, even with the same dates", () => {
    expect(sameExperience(
      { organization: "Delta Sigma Pi", title: "New Member", startDate: "September 2026", endDate: "Present" },
      { organization: "Beta Theta Pi", title: "Recruitment Team", startDate: "September 2026", endDate: "Present" },
    )).toBe(false);
  });

  it("folds duplicates into one entry with every distinct bullet, and moves answers along", () => {
    const profile: ProfileSnapshot = {
      ...DEMO_PROFILE,
      experiences: [
        exp("e1", "Nicolo's Pizza", "Food Server", "June 2022", "August 2026", ["Trained and onboarded 12+ new staff members on service standards and the order-taking system"], 0),
        exp("e2", "Nicolo’s Italian", "Server/Host/Delivery", "June/2022", "August/2026", [
          "Trained 12+ new staff on restaurant procedures, service standards, and order-taking system",
          "Closed out nightly cash and card payments accurately while serving 30–75+ guests per shift",
        ], 1),
      ],
      answers: [{ id: "a1", kind: "deep_dive", question: "?", answer: "Yes", state: "answered", experienceId: "e2", requirementText: null }],
    };
    const merged = mergeDuplicateExperiences(profile);
    expect(merged.experiences).toHaveLength(1);
    expect(merged.experiences[0].organization).toBe("Nicolo's Pizza");
    // The near-identical training bullet is kept once; the payments bullet is added.
    expect(merged.experiences[0].bullets.map((b) => b.id)).toEqual(["e1_b0", "e2_b1"]);
    expect(merged.answers[0].experienceId).toBe("e1");
  });
});

describe("resume rules", () => {
  const profile: ProfileSnapshot = {
    ...DEMO_PROFILE,
    experiences: [
      exp("a", "Brazos Ridge", "Analyst Intern", "May/2026", "August/2026", [
        "Built Excel models tracking quarterly performance of 40 client portfolios against benchmarks",
        "Researched 12 small-cap companies and summarized valuation multiples for weekly meetings",
        "Reconciled monthly client billing statements in QuickBooks for the operations team",
      ], 0),
      exp("b", "Campus Coffee", "Barista", "2024", "2025", ["Served 200+ customers per shift during morning rush hours at the campus location"], 1),
      exp("c", "Finance Club", "Treasurer", "2025", "Present", [
        "Managed a $12,000 annual budget and reported spending to 40 members each semester",
        "Organized 4 speaker events with local finance professionals and alumni",
      ], 2, "leadership"),
    ],
  };
  const evidence = evidenceFrom(profile);
  const line = (text: string, ids: string[]) => ({ text, sourceEvidenceIds: ids, requirementId: null, transformation: "reworded" as const });

  it("never prints the same fact twice", () => {
    const plan: TailorPlan = { entries: {
      a: [line("Built Excel models tracking the quarterly performance of 40 client portfolios against benchmarks", ["a_b0"]), line("Built Excel models that tracked 40 client portfolios' quarterly performance against benchmarks", ["a_b0"])],
      c: [line("Managed a $12,000 annual budget and reported spending to 40 members each semester", ["c_b0"]), line("Organized 4 speaker events with local finance professionals and alumni", ["c_b1"])],
    } };
    const { content } = assembleResume(profile, job, plan, evidence);
    const texts = [...content.experience, ...content.leadership].flatMap((e) => e.bullets.map((b) => b.text));
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) expect(similarBullets(texts[i], texts[j])).toBe(false);
  });

  it("tops a role up to two bullets from its own real bullets", () => {
    const plan: TailorPlan = { entries: { a: [line("Built Excel models tracking quarterly performance of 40 client portfolios against benchmarks", ["a_b0"])], c: [line("Managed a $12,000 annual budget", ["c_b0"]), line("Organized 4 speaker events", ["c_b1"])] } };
    const { content } = assembleResume(profile, job, plan, evidence);
    const a = content.experience.find((e) => e.experienceId === "a")!;
    expect(a.bullets).toHaveLength(2);
    expect(a.bullets[1].text).toBe(profile.experiences[0].bullets[1].text);
  });

  it("keeps the student's own words when a rewrite changed almost nothing", () => {
    const original = profile.experiences[0].bullets[0].text;
    const plan: TailorPlan = { entries: { a: [line(original.replace("40", "40 ").replace("quarterly", "quarterly’"), ["a_b0"]), line("Researched 12 small-cap companies and summarized valuation multiples for weekly meetings", ["a_b1"])] } };
    const { content } = assembleResume(profile, job, plan, evidence);
    const first = content.experience[0].bullets[0];
    expect(first.text).toBe(original);
    expect(first.transformation).toBe("unchanged");
  });

  it("leaves out a role with only one bullet, says why, and prints dates cleanly", () => {
    const plan: TailorPlan = { entries: {
      a: [line("Built Excel models tracking quarterly performance of 40 client portfolios against benchmarks", ["a_b0"]), line("Researched 12 small-cap companies and summarized valuation multiples for weekly meetings", ["a_b1"])],
      b: [line("Served 200+ customers per shift during morning rush hours at the campus location", ["b_b0"])],
    } };
    const { content, changeSummary } = assembleResume(profile, job, plan, evidence);
    expect(content.experience.map((e) => e.experienceId)).toEqual(["a"]);
    expect(changeSummary.some((c) => c.kind === "omitted" && c.description.startsWith("Left out Campus Coffee"))).toBe(true);
    expect(content.experience[0].startDate).toBe("May 2026");
  });
});
