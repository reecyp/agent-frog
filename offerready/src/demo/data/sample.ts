// FICTIONAL sample data for the demo. Jordan Reyes is the AGENT FROG app's own invented demo student
// (offerready/src/domain/__tests__/sampleProfile.ts); every name, employer, number and date is made up.
// Nothing here is read from or written to a real profile.

export const STUDENT = {
  name: "Jordan Reyes",
  school: "Texas Christian University, Neeley School of Business",
  degree: "BBA in Finance, minor in Business Information Systems",
  graduation: "May 2028",
  gpa: "3.62",
  city: "Fort Worth, TX",
};

/** The demo's two source files. The real app takes a resume (PDF, DOCX or TXT, up to 5 MB) and, optionally, a LinkedIn "Save to PDF". */
export const SOURCE_FILES = {
  resume: { name: "Jordan_Reyes_Resume.pdf", pages: 1, read: ["4 roles", "9 bullet points", "8 skills", "education"] },
  linkedin: { name: "Profile.pdf", pages: 2, read: ["the same 4 roles", "education", "Spanish"] },
} as const;

export type FactStatus = "extracted" | "confirmed" | "edited";

export interface Fact {
  id: string;
  text: string;
  /** Shown under the fact: where it came from. */
  source: string;
}

export const EXPERIENCE = {
  organization: "Brazos Ridge Wealth Advisors",
  title: "Financial Analyst Intern",
  dates: "May 2026 – Aug 2026",
  city: "Fort Worth, TX",
};

export const EXPERIENCE_FACTS: Fact[] = [
  { id: "b1", text: "Built Excel models tracking quarterly performance of 40 client portfolios against benchmarks, cutting report preparation from 3 days to 1", source: "Resume, Experience" },
  { id: "b2", text: "Researched 12 small-cap companies and summarized valuation multiples for weekly investment committee meetings", source: "Resume, Experience" },
  { id: "b3", text: "Assisted with reconciling monthly client billing statements in QuickBooks", source: "Resume, Experience" },
];

export const SKILL_FACTS: Fact[] = [
  { id: "s1", text: "Microsoft Excel, advanced", source: "Resume, Skills" },
  { id: "s2", text: "QuickBooks, proficient", source: "Resume, Skills" },
  { id: "s3", text: "SQL, beginner", source: "Resume, Skills" },
  { id: "s4", text: "Spanish, conversational", source: "LinkedIn PDF" },
];

/** Answers from the onboarding questions. The student typed these, so they need no confirming. */
export const PREFERENCES = [
  { label: "Roles", value: "Finance intern, business analyst intern" },
  { label: "Where", value: "Texas or remote" },
  { label: "When", value: "Summer 2027" },
  { label: "How you work", value: "I like turning messy numbers into a clear recommendation." },
];

/** A few lines of the sample resume, set like the Neeley template, for the document drawing. */
export const RESUME_LINES = {
  education: ["Texas Christian University, Neeley School of Business", "Bachelor of Business Administration, Finance · May 2028", "GPA 3.62 · Dean’s List"],
  experience: [
    { head: "Brazos Ridge Wealth Advisors", sub: "Financial Analyst Intern · May 2026 – Aug 2026", bullets: EXPERIENCE_FACTS.map((f) => f.text) },
    { head: "TCU Campus Recreation", sub: "Facility Supervisor · Aug 2025 – Present", bullets: ["Supervise 14 student staff across evening shifts, scheduling coverage for 60+ weekly operating hours"] },
  ],
};
