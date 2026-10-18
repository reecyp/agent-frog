import { desc, eq } from "drizzle-orm";
import { FileSearch, FileText } from "lucide-react";
import { getDb, schema } from "@/server/db";
import { getStudent, loadProfile } from "@/server/profile";
import { Section, formatDate } from "@/components/ui";
import { ExperienceBlock, AddExperience } from "./ExperienceEditor";
import { SkillsEditor } from "./SkillsEditor";
import { ContactForm, PreferencesForm } from "./ProfileForms";
import { ConfirmAllButton } from "./ConfirmAll";

/** The career profile's sections and editors. Shared by the Profile tab and the profile check that ends onboarding. */
export async function ProfileBody({ studentId }: { studentId: string }) {
  const db = await getDb();
  const [student, profile, docs] = await Promise.all([
    getStudent(studentId),
    loadProfile(studentId),
    db.select({ id: schema.sourceDocuments.id, kind: schema.sourceDocuments.kind, filename: schema.sourceDocuments.filename, uploadedAt: schema.sourceDocuments.uploadedAt }).from(schema.sourceDocuments).where(eq(schema.sourceDocuments.studentId, studentId)).orderBy(desc(schema.sourceDocuments.uploadedAt)),
  ]);
  const extracted =
    profile.experiences.filter((x) => x.status === "extracted").length +
    profile.experiences.reduce((n, x) => n + x.bullets.filter((b) => b.status === "extracted").length, 0) +
    profile.skills.filter((s) => s.status === "extracted").length;
  const sections = [
    { id: "experience" as const, title: "Experience" },
    { id: "leadership" as const, title: "Leadership and community experience" },
    { id: "project" as const, title: "Projects" },
  ].map((sec) => ({ ...sec, items: profile.experiences.filter((x) => x.section === sec.id) }))
    .filter((sec) => sec.items.length > 0 || sec.id !== "project");

  const index = [
    { id: "education", label: "Education" },
    ...sections.map((sec) => ({ id: sec.id, label: sec.id === "leadership" ? "Leadership" : sec.title })),
    { id: "skills", label: "Skills" },
    { id: "contact", label: "Contact heading" },
    { id: "preferences", label: "What you're looking for" },
    { id: "sources", label: "Source documents" },
  ];

  return (
    <div className="grid gap-10 @5xl:grid-cols-[11rem_minmax(0,46rem)] @5xl:gap-12">
      <nav aria-label="Profile sections" className="hidden @5xl:block">
        <ul className="sticky top-10 grid gap-0.5 border-l border-line">
          {index.map((i) => (
            <li key={i.id}>
              <a href={`#${i.id}`} className="-ml-px block border-l border-transparent py-1.5 pl-3 text-[0.875rem] text-ink-2 hover:border-line-strong hover:text-ink">{i.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-col gap-12">
        {extracted > 0 && (
          <div role="status" className="flex flex-col gap-3 rounded-panel border border-[rgb(230_191_114/0.25)] bg-caution-soft px-4 py-3 @xl:flex-row @xl:items-center @xl:justify-between">
            <p className="flex gap-2.5 text-[0.875rem] text-ink">
              <FileSearch className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden />
              <span><span className="font-semibold"><span className="t-num">{extracted}</span> {extracted === 1 ? "item" : "items"} from your upload need a look.</span> Check each against your real experience, then confirm.</span>
            </p>
            <div className="shrink-0"><ConfirmAllButton count={extracted} /></div>
          </div>
        )}

        <div id="education" className="scroll-mt-6">
          <Section title="Education">
            {profile.education.length === 0 ? (
              <p className="t-secondary">No education yet. Upload your resume to add it.</p>
            ) : (
              <ul className="list">
                {profile.education.map((e) => (
                  <li key={e.id} className="list-row @xl:px-5">
                    <p className="t-card break-words">{e.school}{e.college ? <span className="font-normal text-ink-2">, {e.college}</span> : null}</p>
                    <p className="t-secondary">{[e.degree, e.graduation].filter(Boolean).join(", ")}</p>
                    <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.875rem]">
                      {([["Major", e.majors], ["Minor", e.minors], ["GPA", e.gpa], ["Honors", e.honors]] as const).filter(([, v]) => v).map(([k, v]) => (
                        <div key={k} className="flex min-w-0 gap-1.5"><dt className="text-ink-3">{k}</dt><dd className="break-words text-ink">{v}</dd></div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {sections.map((sec) => (
          <div key={sec.id} id={sec.id} className="scroll-mt-6">
            <Section title={sec.title} aside={<span className="t-num">{sec.items.length} {sec.items.length === 1 ? "entry" : "entries"}</span>}>
              {sec.items.length === 0 ? (
                <p className="t-secondary">Nothing here yet.</p>
              ) : (
                <div className="list overflow-hidden">{sec.items.map((x) => <ExperienceBlock key={x.id} experience={x} />)}</div>
              )}
            </Section>
          </div>
        ))}
        <div className="-mt-6"><AddExperience /></div>

        <div id="skills" className="scroll-mt-6">
          <Section title="Skills" description="Only list tools you have actually used. If a posting asks for one you haven't, AGENT FROG leaves it off rather than adding it.">
            <SkillsEditor skills={profile.skills} />
          </Section>
        </div>

        <div id="contact" className="scroll-mt-6">
          <Section title="Contact heading" description="The name and contact line at the top of every resume.">
            <ContactForm student={{ fullName: student.fullName, email: student.email, phone: student.phone, linkedin: student.linkedin }} />
          </Section>
        </div>

        <div id="preferences" className="scroll-mt-6">
          <Section title="What you're looking for" description="Job searches start from these.">
            <PreferencesForm prefs={student.preferences} />
          </Section>
        </div>

        <div id="sources" className="scroll-mt-6">
          <Section title="Source documents" description="Originals are kept unchanged.">
            {docs.length === 0 ? (
              <p className="t-secondary">Nothing uploaded yet.</p>
            ) : (
              <ul className="list">
                {docs.map((d) => (
                  <li key={d.id} className="list-row flex items-start gap-3 @xl:px-5">
                    <FileText className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
                    <span className="min-w-0">
                      <span className="block break-words text-[0.875rem] font-semibold">{d.filename}</span>
                      <span className="t-meta block">{d.kind === "linkedin" ? "LinkedIn export" : "Resume"}, uploaded {formatDate(d.uploadedAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
