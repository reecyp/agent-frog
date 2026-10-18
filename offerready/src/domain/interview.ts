import type { EvidenceItem, JobRequirement } from "./types";
import { numbersIn, overlap } from "./text";
import { scorePair } from "./matching";

export interface PracticeQuestion {
  id: string;
  kind: "behavioral" | "role" | "motivation" | "resume";
  text: string;
  why: string;
}

/** The question types a student can pick before a set is written. "Why this company" counts as behavioral. */
export type QuestionFocus = "behavioral" | "role" | "resume";
export const QUESTION_FOCUSES: QuestionFocus[] = ["behavioral", "role", "resume"];
const SET_SIZE = 5;

/** How many of the five questions each chosen type gets, spread as evenly as possible (earlier types take the extra). */
export function focusCounts(focuses: QuestionFocus[]): Partial<Record<QuestionFocus, number>> {
  const picked = QUESTION_FOCUSES.filter((f) => focuses.includes(f));
  const list = picked.length ? picked : QUESTION_FOCUSES;
  return Object.fromEntries(list.map((f, i) => [f, Math.floor(SET_SIZE / list.length) + (i < SET_SIZE % list.length ? 1 : 0)]));
}

/** Five questions of the chosen types, taking turns between types: behavioral, from the posting, and about the resume. */
export function ruleQuestions(
  job: { company: string; title: string; requirements: JobRequirement[] },
  evidence: EvidenceItem[] = [],
  focuses: QuestionFocus[] = QUESTION_FOCUSES,
): PracticeQuestion[] {
  const counts = focusCounts(focuses);

  const behavioral: PracticeQuestion[] = [
    { id: "q_beh_0", kind: "behavioral", text: "Tell me about a time you had to learn something quickly to get a result.", why: "Listening for how you learn and what changed because of it." },
    { id: "q_mot_0", kind: "motivation", text: `Why ${job.company}, and why this role?`, why: "Listening for a specific, genuine reason, not a generic one." },
    { id: "q_beh_1", kind: "behavioral", text: "Describe a time you worked with someone whose approach was different from yours. What did you do?", why: "Listening for collaboration and how you handle friction." },
    { id: "q_beh_2", kind: "behavioral", text: "Tell me about a mistake you made and what you did after you noticed it.", why: "Listening for ownership and what you learned." },
    { id: "q_beh_3", kind: "behavioral", text: "Tell me about a time you led something without being the person in charge.", why: "Listening for initiative and how you bring people along." },
  ];

  const reqs = job.requirements.filter((r) => r.kind !== "education").sort((a, b) => Number(a.preferred) - Number(b.preferred));
  const role: PracticeQuestion[] = reqs.slice(0, SET_SIZE).map((r, i) => ({
    id: `q_role_${i}`,
    kind: "role",
    text: `The posting asks for: "${r.quote}". Tell me about a time you did something like this.`,
    why: "Listening for a specific example that matches what the job needs.",
  }));
  for (const [text, why] of [
    [`What do you expect the first month of a ${job.title} role to involve, and how have you prepared for it?`, "Listening for whether you understand the work."],
    [`Tell me about the project you've done that's closest to the work a ${job.title} does.`, "Listening for hands-on experience with this kind of work."],
    ["Which tools or methods would you use day to day in this role, and where have you used them before?", "Listening for practical, technical familiarity."],
    ["Which part of this role do you expect to find hardest, and how would you get up to speed?", "Listening for self-awareness and a realistic plan."],
    [`If you were handed a problem at ${job.company} you didn't know how to solve, how would you work through it?`, "Listening for how you break down an unfamiliar problem."],
  ]) role.push({ id: `q_role_${role.length}`, kind: "role", text, why });

  // One question per resume entry first, so a set doesn't ask about the same job twice.
  const seen = new Set<string>();
  const bullets = evidence.filter((e) => e.kind === "bullet" && !seen.has(e.experienceId ?? e.id) && seen.add(e.experienceId ?? e.id));
  const resume: PracticeQuestion[] = bullets.slice(0, SET_SIZE).map((e, i) => ({
    id: `q_res_${i}`,
    kind: "resume",
    text: `Your resume says: "${e.text}" (${e.context}). Walk me through it: what was your part, and what changed because of it?`,
    why: "Listening for whether you can back up your resume with detail.",
  }));
  for (const [text, why] of [
    ["Walk me through your resume and how it led you to this role.", "Listening for a clear story that connects your experience to this job."],
    ["Which experience on your resume best prepares you for this role, and why?", "Listening for how you connect your background to the job."],
    ["What on your resume are you proudest of, and what would you do differently now?", "Listening for reflection and growth."],
    ["Pick a skill on your resume and tell me about the last time you actually used it.", "Listening for proof behind the skills you list."],
    ["Is there anything on your resume you'd like to explain in more detail?", "Listening for how you frame your own story."],
  ]) resume.push({ id: `q_res_${resume.length}`, kind: "resume", text, why });

  const pools = { behavioral, role, resume };
  const picked = QUESTION_FOCUSES.flatMap((f) => pools[f].slice(0, counts[f] ?? 0).map((q, turn) => ({ q, turn })));
  return picked.sort((a, b) => a.turn - b.turn).map((x) => x.q);
}

export const FILLERS = ["um", "uh", "like", "you know", "kind of", "sort of", "basically", "actually", "i mean"];

export function countFillers(answer: string): Record<string, number> {
  const t = ` ${answer.toLowerCase().replace(/[^a-z' ]+/g, " ")} `;
  const out: Record<string, number> = {};
  for (const f of FILLERS) {
    const n = t.split(` ${f} `).length - 1;
    if (n) out[f] = n;
  }
  return out;
}

type Coverage = "strong" | "thin" | "missing";
export interface RuleFeedback {
  rating: number;
  star: Record<"situation" | "task" | "action" | "result", { coverage: Coverage; feedback: string }>;
  specificity: string;
  structure: string;
  relevance: string;
  clarity: string;
  talkingPoints: { text: string; sourceEvidenceIds: string[] }[];
  fillers: Record<string, number>;
  wordCount: number;
}

const SIGNALS = {
  situation: /\b(when i was|while (i was )?working|at my|during|last (summer|year|semester)|in my role|as (a|the) |our (team|club|company))\b/i,
  task: /\b(needed to|had to|was asked|my (job|goal|task|role) was|responsible for|the problem|challenge|deadline)\b/i,
  action: /\b(i (built|created|led|organized|analyzed|researched|wrote|set up|designed|reached out|met|scheduled|decided|proposed|trained|reconciled|tracked|managed|asked|started|changed))\b/i,
  result: /\b(as a result|which (led|meant|cut|saved|helped)|so that|in the end|resulted|ended up|reduced|increased|improved|saved|grew|cutting|the outcome)\b/i,
};

/**
 * Heuristic feedback used without an AI key. It only judges the typed text; it never claims to
 * have heard tone or pace, and its talking points come only from the student's own evidence.
 */
export function ruleFeedback(question: string, answer: string, evidence: EvidenceItem[], requirementText?: string): RuleFeedback {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const star = Object.fromEntries(
    (Object.keys(SIGNALS) as (keyof typeof SIGNALS)[]).map((k) => {
      const hit = SIGNALS[k].test(answer);
      const tips: Record<string, string> = {
        situation: "Set the scene in one sentence: where you were and what was going on.",
        task: "Say what you specifically needed to accomplish.",
        action: "Use \"I\" and name the concrete steps you took.",
        result: "End with what changed, using a real number if you have one.",
      };
      return [k, { coverage: hit ? "strong" : "missing", feedback: hit ? "Covered." : tips[k] }];
    }),
  ) as RuleFeedback["star"];
  if (star.result.coverage === "strong" && numbersIn(answer).length === 0) {
    star.result = { coverage: "thin", feedback: "You described a result; a real number would make it stick." };
  }
  const fillers = countFillers(answer);
  const fillerTotal = Object.values(fillers).reduce((a, b) => a + b, 0);
  const target = requirementText ?? question;
  const rel = overlap(target, answer).length;
  const covered = Object.values(star).filter((s) => s.coverage === "strong").length + Object.values(star).filter((s) => s.coverage === "thin").length * 0.5;

  let rating = 1 + covered * 0.75 + (numbersIn(answer).length ? 0.5 : 0) + (rel >= 2 ? 0.5 : 0) - (fillerTotal > 4 ? 0.5 : 0) - (words.length < 60 ? 0.5 : 0);
  rating = Math.max(1, Math.min(5, Math.round(rating * 4) / 4));

  // Talking points: the student's own strongest evidence for this question. Never invented.
  const ranked = evidence
    .filter((e) => (e.kind === "bullet" || e.kind === "answer") && e.status !== "unverified")
    .map((e) => ({ e, s: scorePair(target, e.text).score }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);
  const talkingPoints = ranked.map(({ e }) => ({ text: `Consider using: ${e.text} (${e.context})`, sourceEvidenceIds: [e.id] }));
  if (star.result.coverage !== "strong") talkingPoints.push({ text: "Add the outcome: what was different afterward? Use a number only if you know it.", sourceEvidenceIds: [] });
  if (Object.values(star).some((s) => s.coverage === "missing")) talkingPoints.push({ text: "Try the order Situation, Task, Action, Result in about 90 seconds.", sourceEvidenceIds: [] });

  return {
    rating,
    star,
    specificity: numbersIn(answer).length ? "You used concrete details and numbers." : "Add at least one concrete detail: a number, a tool, or a name of a project.",
    structure: covered >= 3 ? "Easy to follow from setup to result." : "The story is missing parts; see the STAR breakdown.",
    relevance: rel >= 2 ? "Your example connects to what was asked." : "Tie your example back to the question in your last sentence.",
    clarity: words.length < 60 ? `Short (${words.length} words). Aim for 150–250 words, about a minute and a half spoken.` : words.length > 350 ? `Long (${words.length} words). Cut to the strongest example.` : `${words.length} words, a good length.`,
    talkingPoints,
    fillers,
    wordCount: words.length,
  };
}
