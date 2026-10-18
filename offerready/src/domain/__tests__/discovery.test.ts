import { describe, expect, it } from "vitest";
import { classifyLevel, expandTitles, fingerprint, passesFilters, titleMatches } from "../jobs";
import { extractRequirements, htmlToText, seniorityMismatch, topKeywords } from "../requirements";
import { assessFit, findStrongestMatch } from "../matching";
import { evidenceFrom } from "../profile";
import { DEMO_PROFILE } from "./sampleProfile";

const POSTING = `
<p>About the role</p><p>We build payments software.</p>
<h3>What you'll do</h3><ul><li>Build financial models for monthly forecasting</li><li>Partner with accounting on close</li></ul>
<h3>What we're looking for</h3>
<ul><li>Pursuing a degree in Finance, Accounting, or Economics</li>
<li>Advanced Excel skills and experience with financial modeling</li>
<li>Strong attention to detail and clear written communication</li></ul>
<h3>Nice to have</h3><ul><li>Experience with SQL or Python</li></ul>
<h3>Benefits</h3><ul><li>Free lunch on Fridays</li></ul>`;

describe("posting parsing", () => {
  const text = htmlToText(POSTING);
  const reqs = extractRequirements(text);

  it("quotes requirements verbatim from the posting", () => {
    for (const r of reqs) expect(text).toContain(r.quote);
  });

  it("separates required from preferred, and ignores benefits", () => {
    expect(reqs.find((r) => r.quote.includes("Advanced Excel"))?.preferred).toBe(false);
    expect(reqs.find((r) => r.quote.includes("SQL or Python"))?.preferred).toBe(true);
    expect(reqs.some((r) => r.quote.includes("Free lunch"))).toBe(false);
  });

  it("decodes Greenhouse's escaped HTML", () => {
    expect(htmlToText("&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;")).toBe("Hello & welcome");
  });

  it("returns 3-5 keywords", () => {
    const k = topKeywords(text, reqs);
    expect(k.length).toBeGreaterThanOrEqual(3);
    expect(k.length).toBeLessThanOrEqual(5);
  });

  it("detects a fake entry-level posting", () => {
    expect(seniorityMismatch("Entry level analyst. Requires 5+ years of experience in banking.")).toMatch(/5\+ years/);
    expect(seniorityMismatch("1 year of experience preferred")).toBeNull();
  });
});

describe("job classification and filtering", () => {
  it("does not mistake 'International' for an internship", () => {
    expect(classifyLevel("International Payroll Analyst")).toBe("full_time");
    expect(classifyLevel("Finance Intern (Summer 2027)")).toBe("internship");
  });

  it("treats the same role at the same location as a duplicate", () => {
    expect(fingerprint("Stripe", "Finance Intern (Summer 2027)", "Dallas, TX")).toBe(fingerprint("stripe", "Finance Intern", "Dallas, TX; Remote"));
    expect(fingerprint("Stripe", "Finance Intern", "Dallas")).not.toBe(fingerprint("Stripe", "Finance Intern", "New York"));
  });

  it("expands a target role into title variants", () => {
    expect(expandTitles(["finance internship"])).toContain("financial analyst");
    expect(titleMatches("Strategic Finance Intern", expandTitles(["finance internship"]))).toBe(true);
    expect(titleMatches("Software Engineer Intern", expandTitles(["finance internship"]))).toBe(false);
  });

  it("filters by level and location", () => {
    const f = { titles: ["finance intern"], keywords: [], jobTypes: ["internship" as const], locations: ["Texas"], arrangements: [], companies: [], postedWithinDays: null };
    const base = { company: "X", postedAt: null, arrangement: "onsite" as const };
    expect(passesFilters({ ...base, title: "Finance Intern", location: "Dallas, TX", level: "internship" }, f)).toBe(true);
    expect(passesFilters({ ...base, title: "Finance Intern", location: "New York, NY", level: "internship" }, f)).toBe(false);
    expect(passesFilters({ ...base, title: "Senior Finance Manager", location: "Dallas, TX", level: "full_time" }, f)).toBe(false);
  });

  it("doesn't let a keyword alone admit an unrelated title", () => {
    const f = { titles: ["finance intern"], keywords: ["Summer 2027", "sophomore"], jobTypes: ["internship" as const], locations: ["Fort Worth, TX"], arrangements: [], companies: [], postedWithinDays: null };
    const base = { company: "X", postedAt: null, arrangement: "onsite" as const, location: "Dallas, Texas", level: "internship" as const };
    expect(passesFilters({ ...base, title: "Summer 2027 - Electrical Engineering Intern" }, f)).toBe(false);
    expect(passesFilters({ ...base, title: "Finance Intern - Summer 2027" }, f)).toBe(true);
    expect(passesFilters({ ...base, title: "Valuation Intern" }, { ...f, titles: [], keywords: ["valuation"] })).toBe(true);
  });
});

describe("Strongest Match and fit", () => {
  const reqs = extractRequirements(htmlToText(POSTING));
  const evidence = evidenceFrom(DEMO_PROFILE);

  it("cites a real posting line and a real profile line", () => {
    const m = findStrongestMatch(reqs, evidence)!;
    expect(reqs.map((r) => r.quote)).toContain(m.requirementQuote);
    expect(evidence.map((e) => e.text)).toContain(m.evidenceText);
  });

  it("says when the match is weak", () => {
    const m = findStrongestMatch([{ id: "r", quote: "Experience with underwater welding", keywords: [], kind: "experience", preferred: false }], evidence);
    expect(m === null || m.strength === "weak").toBe(true);
  });

  it("explains the fit label with factors that add up", () => {
    const fit = assessFit(reqs, evidence, { levelMatches: true, locationMatches: true, seniorityFlag: null });
    expect(fit.factors.reduce((n, f) => n + f.weight, 0)).toBe(fit.points);
    expect(["strong", "good", "stretch"]).toContain(fit.fit);
  });
});
