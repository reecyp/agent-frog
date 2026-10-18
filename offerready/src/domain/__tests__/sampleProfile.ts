// A FICTIONAL student used as a test fixture. Every employer, number and date below was written by
// hand as a realistic stand-in profile. The contact details reuse the Neeley template's own
// placeholders so they can never reach a real person.
import type { ProfileSnapshot } from "../profile";
import type { StudentPreferences } from "../types";

export const DEMO_STUDENT_ID = "stu_demo";

export const DEMO_PREFERENCES: StudentPreferences = {
  targetRoles: ["Finance intern", "Business analyst intern"],
  industries: ["Financial technology", "Software"],
  jobTypes: ["internship"],
  locations: ["Texas", "Remote"],
  arrangements: ["remote", "hybrid", "onsite"],
  timeframe: "Summer 2027",
  graduation: "May 2028",
  workStyle: "Analyst: I like turning messy numbers into a clear recommendation.",
};

export const DEMO_PROFILE: ProfileSnapshot = {
  student: {
    id: DEMO_STUDENT_ID,
    fullName: "Jordan Reyes",
    email: "horned.frogs@tcu.edu",
    phone: "555.555.5555",
    linkedin: "www.linkedin.com/in/hornedfrogs",
  },
  education: [
    {
      id: "edu_tcu",
      school: "Texas Christian University",
      college: "Neeley School of Business",
      city: "Fort Worth, TX",
      degree: "Bachelor of Business Administration",
      graduation: "May 2028",
      majors: "Finance",
      minors: "Business Information Systems",
      gpa: "3.62",
      honors: "Dean's List",
      coursework: "",
      status: "confirmed",
    },
  ],
  experiences: [
    {
      id: "exp_brazos",
      section: "experience",
      organization: "Brazos Ridge Wealth Advisors",
      city: "Fort Worth, TX",
      title: "Financial Analyst Intern",
      startDate: "May 2026",
      endDate: "Aug 2026",
      status: "confirmed",
      provenance: "demo",
      sortOrder: 0,
      bullets: [
        { id: "b_brazos_1", text: "Built Excel models tracking quarterly performance of 40 client portfolios against benchmarks, cutting report preparation from 3 days to 1", originalText: "Built Excel models tracking quarterly performance of 40 client portfolios against benchmarks, cutting report preparation from 3 days to 1", status: "confirmed", provenance: "demo", sortOrder: 0 },
        { id: "b_brazos_2", text: "Researched 12 small-cap companies and summarized valuation multiples for weekly investment committee meetings", originalText: "Researched 12 small-cap companies and summarized valuation multiples for weekly investment committee meetings", status: "confirmed", provenance: "demo", sortOrder: 1 },
        { id: "b_brazos_3", text: "Assisted with reconciling monthly client billing statements in QuickBooks", originalText: "Assisted with reconciling monthly client billing statements in QuickBooks", status: "confirmed", provenance: "demo", sortOrder: 2 },
      ],
    },
    {
      id: "exp_rec",
      section: "experience",
      organization: "TCU Campus Recreation",
      city: "Fort Worth, TX",
      title: "Facility Supervisor",
      startDate: "Aug 2025",
      endDate: "Present",
      status: "confirmed",
      provenance: "demo",
      sortOrder: 1,
      bullets: [
        { id: "b_rec_1", text: "Supervise 14 student staff across evening shifts, scheduling coverage for 60+ weekly operating hours", originalText: "Supervise 14 student staff across evening shifts, scheduling coverage for 60+ weekly operating hours", status: "confirmed", provenance: "demo", sortOrder: 0 },
        { id: "b_rec_2", text: "Resolve patron and staff conflicts while enforcing risk-management policies for 2,000+ daily visitors", originalText: "Resolve patron and staff conflicts while enforcing risk-management policies for 2,000+ daily visitors", status: "confirmed", provenance: "demo", sortOrder: 1 },
      ],
    },
    {
      id: "exp_hfia",
      section: "leadership",
      organization: "Horned Frog Investment Association",
      city: "Fort Worth, TX",
      title: "Treasurer",
      startDate: "Aug 2025",
      endDate: "Present",
      status: "confirmed",
      provenance: "demo",
      sortOrder: 2,
      bullets: [
        { id: "b_hfia_1", text: "Manage a $6,200 annual budget for a 45-member organization, publishing monthly expense reports in Excel", originalText: "Manage a $6,200 annual budget for a 45-member organization, publishing monthly expense reports in Excel", status: "confirmed", provenance: "demo", sortOrder: 0 },
        { id: "b_hfia_2", text: "Organized 3 speaker events with Dallas–Fort Worth finance professionals, averaging 60 attendees", originalText: "Organized 3 speaker events with Dallas–Fort Worth finance professionals, averaging 60 attendees", status: "confirmed", provenance: "demo", sortOrder: 1 },
      ],
    },
    {
      id: "exp_mentor",
      section: "leadership",
      organization: "Fort Worth Youth Mentoring Program",
      city: "Fort Worth, TX",
      title: "Volunteer Mentor",
      startDate: "Jan 2025",
      endDate: "Present",
      status: "confirmed",
      provenance: "demo",
      sortOrder: 3,
      bullets: [
        { id: "b_mentor_1", text: "Mentor 2 middle-school students weekly in math and study skills", originalText: "Mentor 2 middle-school students weekly in math and study skills", status: "confirmed", provenance: "demo", sortOrder: 0 },
        { id: "b_mentor_2", text: "Planned a financial-literacy workshop on budgeting basics for 25 students", originalText: "Planned a financial-literacy workshop on budgeting basics for 25 students", status: "confirmed", provenance: "demo", sortOrder: 1 },
      ],
    },
  ],
  skills: [
    { id: "sk_excel", category: "technical", name: "Microsoft Excel", proficiency: "Advanced", status: "confirmed", provenance: "demo" },
    { id: "sk_ppt", category: "technical", name: "PowerPoint", proficiency: "Proficient", status: "confirmed", provenance: "demo" },
    { id: "sk_qb", category: "technical", name: "QuickBooks", proficiency: "Proficient", status: "confirmed", provenance: "demo" },
    { id: "sk_sql", category: "technical", name: "SQL", proficiency: "Beginner", status: "confirmed", provenance: "demo" },
    { id: "sk_tableau", category: "technical", name: "Tableau", proficiency: "Beginner", status: "confirmed", provenance: "demo" },
    { id: "sk_mos", category: "certification", name: "Microsoft Office Specialist: Excel and PowerPoint", proficiency: "", status: "confirmed", provenance: "demo" },
    { id: "sk_es", category: "language", name: "Spanish", proficiency: "Conversational", status: "confirmed", provenance: "demo" },
    { id: "sk_int", category: "interest", name: "Texas Rangers baseball, long-distance cycling, personal finance podcasts", proficiency: "", status: "confirmed", provenance: "demo" },
  ],
  answers: [
    { id: "ans_val", kind: "deep_dive", question: "For the 12 small-cap companies you researched, which valuation multiples did you summarize, and where did the data come from?", answer: "EV/EBITDA and P/E, pulled from company 10-K filings and Yahoo Finance.", state: "answered", experienceId: "exp_brazos", requirementText: null },
    { id: "ans_hfia", kind: "deep_dive", question: "As Treasurer, did your expense reports change any decision the officers made?", answer: "", state: "pending", experienceId: "exp_hfia", requirementText: null },
  ],
};
