// Rule-based resume parser used when Claude is not configured. It only copies text it finds;
// every result is marked "extracted" so the student confirms it before it becomes evidence.

export interface ParsedResume {
  contact: { fullName: string; email: string; phone: string; linkedin: string };
  education: { school: string; college: string; city: string; degree: string; graduation: string; majors: string; minors: string; gpa: string; honors: string; coursework: string }[];
  experiences: { section: "experience" | "leadership" | "project"; organization: string; city: string; title: string; startDate: string; endDate: string; bullets: string[] }[];
  skills: { category: "technical" | "certification" | "language" | "interest"; name: string; proficiency: string }[];
  uncertain: string[];
}

const MONTH = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Summers?|Fall|Spring|Winter)";
const DATE = `${MONTH}\\.?\\s+\\d{4}`;
const RANGE = new RegExp(`(${DATE})\\s*[-–—]+\\s*(${DATE}|Present|Current)\\s*$`, "i");
const SINGLE = new RegExp(`(${DATE})\\s*$`, "i");

type Section = "header" | "education" | "experience" | "leadership" | "project" | "skills" | "other";

const KNOWN_HEADING = /^(education|experience|work experience|professional experience|relevant experience|leadership( and community experience)?|leadership & community|community involvement|activities|projects|academic projects|skills|skills & interests|skills and interests)$/i;

function sectionOf(line: string): Section | null {
  const l = line.trim().replace(/:$/, "");
  const allCaps = /^[A-Z][A-Z &/,-]{3,49}$/.test(l);
  if (!allCaps && !KNOWN_HEADING.test(l)) return null;
  if (/^education/i.test(l)) return "education";
  if (/leadership|community|involvement|activities|volunteer/i.test(l)) return "leadership";
  if (/experience|employment|work history/i.test(l)) return "experience";
  if (/projects?/i.test(l)) return "project";
  if (/skills|certifications|languages|interests/i.test(l)) return "skills";
  if (/^[A-Z][A-Z &/]{3,}$/.test(l)) return "other";
  return null;
}

const BULLET = /^\s*[•●▪◦\-–*]\s*/;

export function parseResumeText(raw: string): ParsedResume {
  const lines = raw.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const out: ParsedResume = { contact: { fullName: "", email: "", phone: "", linkedin: "" }, education: [], experiences: [], skills: [], uncertain: [] };
  const all = lines.join(" \n ");
  out.contact.email = all.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? "";
  out.contact.phone = all.match(/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/)?.[0] ?? "";
  out.contact.linkedin = all.match(/(?:www\.)?linkedin\.com\/in\/[\w-]+/i)?.[0] ?? "";
  out.contact.fullName = lines.find((l) => !/@|\d{3}|linkedin/i.test(l) && l.split(" ").length <= 5) ?? "";

  let section: Section = "header";
  let current: ParsedResume["experiences"][number] | null = null;
  let pendingTitle = false;
  for (const line of lines) {
    const s = sectionOf(line);
    if (s) {
      section = s;
      current = null;
      continue;
    }
    if (section === "education") {
      const range = line.match(SINGLE);
      if (/university|college|school|institute/i.test(line) && !/bachelor|master|major/i.test(line)) {
        const [school, ...rest] = line.replace(SINGLE, "").split(",");
        const city = line.match(/([A-Z][a-zA-Z .]+,\s*[A-Z]{2})\s*$/)?.[1] ?? "";
        out.education.push({ school: school.trim(), college: rest.join(",").replace(city, "").replace(/,\s*$/, "").trim(), city, degree: "", graduation: "", majors: "", minors: "", gpa: "", honors: "", coursework: "" });
      } else if (out.education.length) {
        const ed = out.education[out.education.length - 1];
        if (/bachelor|master|associate|b\.?b\.?a|b\.?s\.?|b\.?a\.?/i.test(line)) {
          ed.degree = line.replace(SINGLE, "").trim();
          if (range) ed.graduation = range[1];
        }
        const gpa = line.match(/GPA:?\s*([\d.]+)/i);
        if (gpa) ed.gpa = gpa[1];
        const major = line.match(/Majors?(?:\(s\))?:\s*([^:]+?)(?=\s+Minors?|\s+GPA|$)/i);
        if (major) ed.majors = major[1].trim();
        const minor = line.match(/Minors?(?:\(s\))?:\s*([^:]+?)(?=\s+GPA|$)/i);
        if (minor) ed.minors = minor[1].trim();
        if (/^honors/i.test(line)) ed.honors = line.replace(/^honors[^:]*:\s*/i, "");
        if (/^relevant coursework/i.test(line)) ed.coursework = line.replace(/^relevant coursework:\s*/i, "");
      }
      continue;
    }
    if (section === "experience" || section === "leadership" || section === "project") {
      const range = line.match(RANGE);
      if (range && !BULLET.test(line)) {
        const head = line.replace(RANGE, "").trim().replace(/,\s*$/, "");
        const city = head.match(/,\s*([A-Z][a-zA-Z .]+,\s*[A-Z]{2})$/)?.[1] ?? "";
        const org = city ? head.slice(0, head.lastIndexOf(city)).replace(/,\s*$/, "") : head;
        current = { section, organization: org.trim(), city, title: "", startDate: range[1], endDate: range[2], bullets: [] };
        out.experiences.push(current);
        pendingTitle = true;
        continue;
      }
      if (!current) continue;
      if (BULLET.test(line)) {
        current.bullets.push(line.replace(BULLET, "").trim());
        pendingTitle = false;
      } else if (pendingTitle) {
        current.title = line;
        pendingTitle = false;
      } else if (current.bullets.length) {
        current.bullets[current.bullets.length - 1] += ` ${line}`; // wrapped bullet continuation
      }
      continue;
    }
    if (section === "skills") {
      const m = line.match(/^(Technical|Technical Skills|Certifications?|Languages?|Interests?)[^:]*:\s*(.+)$/i);
      if (!m) continue;
      const cat = /^tech/i.test(m[1]) ? "technical" : /^cert/i.test(m[1]) ? "certification" : /^lang/i.test(m[1]) ? "language" : "interest";
      if (cat === "interest") {
        out.skills.push({ category: cat, name: m[2].trim(), proficiency: "" });
        continue;
      }
      for (const part of m[2].split(/,(?![^(]*\))|;/)) {
        const p = part.trim();
        if (!p) continue;
        const prof = p.match(/\(([^)]+)\)\s*$/);
        out.skills.push({ category: cat, name: p.replace(/\s*\([^)]+\)\s*$/, ""), proficiency: prof?.[1] ?? "" });
      }
    }
  }
  for (const x of out.experiences) {
    if (!x.title) out.uncertain.push(`No job title found for ${x.organization}.`);
    if (x.bullets.length === 0) out.uncertain.push(`No bullets found under ${x.organization}.`);
  }
  if (!out.experiences.length) out.uncertain.push("Couldn't find any experience entries. Check the resume uses a date range like \"May 2026 – Aug 2026\".");
  return out;
}
