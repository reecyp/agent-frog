import { describe, expect, it } from "vitest";
import { DEMO_PROFILE } from "@/domain/__tests__/sampleProfile";
import { evidenceFrom } from "@/domain/profile";
import { assembleResume, rulePlan, type JobContext } from "@/domain/tailor";
import { checkAts, documentPlainText, readingOrderIntact } from "@/domain/ats";
import { extractPdfText, renderResumePdf } from "@/server/documents/pdf";

const job: JobContext = {
  company: "Example", title: "Finance Intern", sourceLabel: "test", keywords: ["Excel", "Valuation"],
  requirements: [{ id: "req_1", quote: "Advanced Excel and valuation skills", keywords: ["Excel", "Valuation"], kind: "skill", preferred: false }],
};

describe("resume PDF export", () => {
  const evidence = evidenceFrom(DEMO_PROFILE);
  const { content } = assembleResume(DEMO_PROFILE, job, rulePlan(DEMO_PROFILE, job), evidence);
  // Simulate the student removing one line before export.
  const removedText = content.experience[0].bullets[2].text;
  content.experience[0].bullets[2] = { ...content.experience[0].bullets[2], decision: "removed" };

  it("renders one page of real, extractable text in the right reading order", async () => {
    const { bytes, pageCount } = await renderResumePdf(content);
    expect(pageCount).toBe(1);
    const { text, pages } = await extractPdfText(bytes);
    expect(pages).toBe(1);
    expect(readingOrderIntact(documentPlainText(content), text)).toBe(true);
    expect(text).toContain("LEADERSHIP AND COMMUNITY EXPERIENCE");
  });

  it("writes whole lines as text runs, so parsers don't see one word per line", async () => {
    const { bytes } = await renderResumePdf(content);
    const { text } = await extractPdfText(bytes);
    expect(text).toContain("Built Excel models tracking quarterly performance");
  });

  it("leaves removed lines and review annotations out of the export", async () => {
    const { bytes } = await renderResumePdf(content);
    const { text } = await extractPdfText(bytes);
    expect(text.replace(/\s+/g, " ")).not.toContain(removedText.slice(0, 30));
    expect(text).not.toMatch(/needs review|PERSONALIZE|What changed/i);
  });

  it("passes the ATS format checks", async () => {
    const { bytes, pageCount } = await renderResumePdf(content);
    const { text } = await extractPdfText(bytes);
    const report = checkAts({ doc: content, keywords: job.keywords, evidence, pdf: { pageCount, extractedText: text } });
    const failed = report.checks.filter((c) => c.group === "format" && !c.passed);
    expect(failed).toEqual([]);
  });
});
