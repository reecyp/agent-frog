import type { EvidenceItem, EvidenceStatus, Provenance } from "./types";

/** Everything known about a student, as loaded from the database. */
export interface ProfileSnapshot {
  student: { id: string; fullName: string; email: string; phone: string; linkedin: string };
  education: {
    id: string;
    school: string;
    college: string;
    city: string;
    degree: string;
    graduation: string;
    majors: string;
    minors: string;
    gpa: string;
    honors: string;
    coursework: string;
    status: EvidenceStatus;
  }[];
  experiences: {
    id: string;
    section: "experience" | "leadership" | "project";
    organization: string;
    city: string;
    title: string;
    startDate: string;
    endDate: string;
    status: EvidenceStatus;
    provenance: Provenance;
    sortOrder: number;
    bullets: { id: string; text: string; originalText: string; status: EvidenceStatus; provenance: Provenance; sortOrder: number }[];
  }[];
  skills: { id: string; category: "technical" | "certification" | "language" | "interest"; name: string; proficiency: string; status: EvidenceStatus; provenance: Provenance }[];
  answers: { id: string; kind: string; question: string; answer: string; state: "pending" | "answered" | "declined"; experienceId: string | null; requirementText: string | null }[];
}

/** Flattens a profile into citable evidence items with stable ids. */
export function evidenceFrom(p: ProfileSnapshot): EvidenceItem[] {
  const out: EvidenceItem[] = [];
  for (const ed of p.education) {
    const text = [ed.degree, ed.majors && `Major: ${ed.majors}`, ed.minors && `Minor: ${ed.minors}`, ed.school, ed.honors, ed.coursework]
      .filter(Boolean)
      .join("; ");
    out.push({ id: ed.id, kind: "education", text, status: ed.status, provenance: "resume", context: ed.school });
  }
  for (const x of p.experiences) {
    const context = `${x.title}, ${x.organization}`;
    out.push({ id: `${x.id}:title`, kind: "title", text: `${x.title} at ${x.organization}`, status: x.status, provenance: x.provenance, experienceId: x.id, context });
    for (const b of x.bullets) {
      out.push({ id: b.id, kind: "bullet", text: b.text, status: b.status, provenance: b.provenance, experienceId: x.id, context });
    }
  }
  for (const s of p.skills) {
    out.push({
      id: s.id,
      kind: "skill",
      text: s.proficiency ? `${s.name} (${s.proficiency})` : s.name,
      status: s.status,
      provenance: s.provenance,
      context: s.category === "technical" ? "Technical skills" : s.category === "language" ? "Languages" : s.category === "certification" ? "Certifications" : "Interests",
    });
  }
  for (const a of p.answers) {
    if (a.state !== "answered" || !a.answer.trim()) continue;
    const exp = p.experiences.find((x) => x.id === a.experienceId);
    out.push({
      id: a.id,
      kind: "answer",
      text: a.answer,
      status: "confirmed",
      provenance: "answer",
      experienceId: a.experienceId ?? undefined,
      context: exp ? `Your answer about ${exp.title}, ${exp.organization}` : "Your answer",
    });
  }
  return out;
}

export function declinedRequirements(p: ProfileSnapshot): Set<string> {
  return new Set(p.answers.filter((a) => a.state === "declined" && a.requirementText).map((a) => a.requirementText as string));
}
