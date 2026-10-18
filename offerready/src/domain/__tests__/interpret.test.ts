import { describe, expect, it } from "vitest";
import { interpretSearchRules } from "../searchInterpret";
import { DEMO_PREFERENCES } from "./sampleProfile";

describe("rule-based search interpretation", () => {
  it("turns a plain request into clean filters", () => {
    const f = interpretSearchRules("Finance internships at tech companies in Dallas or remote for next summer, interested in valuation and FP&A", DEMO_PREFERENCES);
    expect(f.jobTypes).toEqual(["internship"]);
    expect(f.locations).toEqual(["Dallas, TX", "Remote"]);
    // "or remote" widens locations; it is not a remote-only preference.
    expect(f.arrangements).toEqual([]);
    expect(f.keywords).toEqual(expect.arrayContaining(["valuation", "FP&A", "tech"]));
    expect(f.keywords.join(" ")).not.toMatch(/dallas|summer/i);
    expect(f.titles).toContain("financial analyst");
  });

  it("restricts the arrangement only when the student states a preference", () => {
    expect(interpretSearchRules("marketing internship, I prefer hybrid roles", DEMO_PREFERENCES).arrangements).toEqual(["hybrid"]);
    expect(interpretSearchRules("remote only data analyst jobs", DEMO_PREFERENCES).arrangements).toEqual(["remote"]);
  });

  it("falls back to saved preferences when the request is silent", () => {
    const f = interpretSearchRules("something in finance", DEMO_PREFERENCES);
    expect(f.locations).toEqual(DEMO_PREFERENCES.locations);
    expect(f.jobTypes).toEqual(DEMO_PREFERENCES.jobTypes);
  });
});
