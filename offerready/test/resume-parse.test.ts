import { describe, expect, it } from "vitest";
import { DEMO_PROFILE } from "@/domain/__tests__/sampleProfile";
import { evidenceFrom } from "@/domain/profile";
import { assembleResume, rulePlan } from "@/domain/tailor";
import { parseResumeText } from "@/domain/resumeParse";
import { extractPdfText, renderResumePdf } from "@/server/documents/pdf";

describe("rule-based resume parser", () => {
  it("round-trips a resume rendered on the Neeley template", async () => {
    // Render the demo resume unchanged, then parse it back as if a student uploaded it.
    const job = { company: "x", title: "x", sourceLabel: "x", keywords: [], requirements: [] };
    const { content } = assembleResume(DEMO_PROFILE, job, rulePlan(DEMO_PROFILE, job), evidenceFrom(DEMO_PROFILE));
    const { bytes } = await renderResumePdf(content);
    const { text } = await extractPdfText(bytes);
    const parsed = parseResumeText(text);

    expect(parsed.contact.email).toBe("horned.frogs@tcu.edu");
    expect(parsed.education[0].school).toBe("Texas Christian University");
    expect(parsed.education[0].gpa).toBe("3.62");
    const orgs = parsed.experiences.map((x) => x.organization);
    expect(orgs).toContain("Brazos Ridge Wealth Advisors");
    expect(orgs).toContain("Horned Frog Investment Association");
    const brazos = parsed.experiences.find((x) => x.organization === "Brazos Ridge Wealth Advisors")!;
    expect(brazos.title).toBe("Financial Analyst Intern");
    expect(brazos.startDate).toBe("May 2026");
    // Bullets come back verbatim, including wrapped lines.
    for (const b of DEMO_PROFILE.experiences[0].bullets.slice(0, 2)) expect(brazos.bullets).toContain(b.text);
    expect(parsed.experiences.find((x) => x.organization === "Horned Frog Investment Association")?.section).toBe("leadership");
    expect(parsed.skills.some((s) => s.name === "SQL" && s.proficiency === "Beginner")).toBe(true);
  });
});
