import type { ProfileSnapshot } from "./profile";
import { numbersIn, toolSkillsIn } from "./text";

export interface DeepDiveQuestion {
  experienceId: string;
  question: string;
  why: string;
}

/**
 * Up to five questions that dig into detail the resume implies but doesn't state.
 * Never suggests an answer; skips anything already asked.
 */
export function ruleDeepDive(p: ProfileSnapshot): DeepDiveQuestion[] {
  const asked = new Set(p.answers.map((a) => a.question.toLowerCase()));
  const out: DeepDiveQuestion[] = [];
  const push = (q: DeepDiveQuestion) => {
    if (!asked.has(q.question.toLowerCase()) && !out.some((x) => x.question === q.question)) out.push(q);
  };
  for (const x of p.experiences) {
    const label = `${x.title} at ${x.organization}`;
    const text = x.bullets.map((b) => b.text).join(" ");
    for (const b of x.bullets) {
      if (numbersIn(b.text).length === 0 && /\b(improv|increas|grew|reduc|sav|launch|organiz|led|built|creat|plann|manag)/i.test(b.text)) {
        push({ experienceId: x.id, question: `As ${label}, you wrote "${b.text}". Was there a measurable result, such as how many people, how much money, or how much time?`, why: "Adds a real result to this bullet, if there was one." });
        break;
      }
    }
    if (/\b(team|club|association|organization|council|committee|chapter)\b/i.test(`${x.organization} ${text}`) && !/\b\d+[- ](member|person|people|student)/i.test(text)) {
      push({ experienceId: x.id, question: `As ${label}, how many people were on the team or in the organization, and what was your part?`, why: "Shows the scale of what you did and what you owned." });
    }
    if (toolSkillsIn(text).length === 0 && x.section === "experience") {
      push({ experienceId: x.id, question: `As ${label}, which tools or software did you actually use (for example Excel, a CRM, a scheduling system)?`, why: "Lets OfferReady match tools in postings honestly." });
    }
    if (/\b(resolv|problem|conflict|issue|challeng)/i.test(text)) {
      push({ experienceId: x.id, question: `As ${label}, describe one specific problem you helped solve and how it turned out.`, why: "A ready-made story for interviews and cover letters." });
    }
  }
  return out.slice(0, 5);
}

const BEHAVIORAL = [
  "Tell us about a time you led a group or took charge of something. What did you do, and how did it turn out?",
  "Describe a setback or disagreement you worked through with others. What did you do about it?",
  "When did you take initiative on something nobody asked you to do? What happened?",
  "Tell us about a time you had to learn something new quickly. How did you go about it?",
];

/** The six questions asked right after upload: resume follow-ups, then behavioral stories. */
export function ruleOnboardingQuestions(p: ProfileSnapshot): { experienceId: string | null; question: string }[] {
  const resume = ruleDeepDive(p).slice(0, 3);
  return [...resume, ...BEHAVIORAL.slice(0, 6 - resume.length).map((question) => ({ experienceId: null, question }))];
}
