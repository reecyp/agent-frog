import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { Ban, CheckCircle2, CircleDashed, FileUp } from "lucide-react";
import { aiConfigured, CLAUDE_MODEL } from "@/server/ai/claude";
import { speechConfigured } from "@/server/speech";
import { dbInfo } from "@/server/db";
import { alumniStatus } from "@/server/alumni";
import { adzunaConfigured } from "@/server/jobs/providers";
import { BOARDS } from "@/server/jobs/companies";
import { activeStudentId, getStudent } from "@/server/profile";
import { ListSkeleton, PageHeader, SectionTabs, Section } from "@/components/ui";
import Link from "next/link";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        tabs={<SectionTabs group="settings" current="/settings" />}
        title="Settings"
        lede="What's connected right now, what isn't, and how to set it up. Nothing here pretends a service is live."
      />
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <Settings />
      </Suspense>
    </>
  );
}

type RowState = "on" | "off" | "never";

const STATE: Record<RowState, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  on: { label: "Connected", cls: "badge-ok", Icon: CheckCircle2 },
  off: { label: "Not set up", cls: "badge-caution", Icon: CircleDashed },
  never: { label: "Off by design", cls: "badge-neutral", Icon: Ban },
};

function Row({ name, ok, state, status, setup }: { name: string; ok?: boolean; state?: RowState; status: string; setup?: React.ReactNode }) {
  const st = STATE[state ?? (ok ? "on" : "off")];
  return (
    <li className="grid gap-2 px-4 py-4 @2xl:grid-cols-[13rem_minmax(0,1fr)] @2xl:gap-6 @2xl:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2 @2xl:flex-col @2xl:items-start @2xl:justify-start">
        <p className="font-semibold text-ink">{name}</p>
        <span className={`badge ${st.cls}`}><st.Icon className="size-3.5" aria-hidden /> {st.label}</span>
      </div>
      <div className="min-w-0 text-[0.875rem] text-ink-2">
        <p className="measure break-words">{status}</p>
        {setup && <div className="mt-2 break-words rounded-control bg-bg-subtle px-3 py-2 text-[0.8125rem] text-ink-2">{setup}</div>}
      </div>
    </li>
  );
}

async function Settings() {
  await connection();
  const studentId = await activeStudentId();
  const [student, alumni] = await Promise.all([getStudent(studentId), alumniStatus()]);
  const db = dbInfo();
  const ai = aiConfigured();
  return (
    <div className="flex flex-col gap-12">
      <Section title="Connections">
        <ul className="list">
          <Row name="AI drafting (Claude)" ok={ai} status={ai ? `Connected. Using ${CLAUDE_MODEL} for parsing, tailoring, cover letters, questions and feedback, with server-side refusal fallback.` : "Not configured. Drafting, parsing and feedback use deterministic rules instead. Nothing is faked."} setup={!ai && <>Add <code className="t-mono">ANTHROPIC_API_KEY</code> to <code className="t-mono">.env.local</code> and restart.</>} />
          <Row name="Database" ok={db.driver === "neon"} status={db.description} setup={db.driver !== "neon" && <>Create a Neon project, put its connection string in <code className="t-mono">DATABASE_URL</code>, run <code className="t-mono">npm run db:migrate</code>, then restart. Until then data lives only on this computer.</>} />
          <Row name="Employer job boards" state="on" status={`${BOARDS.length} public Greenhouse, Lever and Ashby boards, read live with no login. Each result is opened on the employer's own board before it's shown.`} />
          <Row name="Adzuna (aggregator)" ok={adzunaConfigured()} status={adzunaConfigured() ? "Connected. Adzuna only shares a preview of each posting, so its results link out to the full text." : "Not configured. Searches use employer boards only."} setup={!adzunaConfigured() && <>Get free keys at developer.adzuna.com, then set <code className="t-mono">ADZUNA_APP_ID</code> and <code className="t-mono">ADZUNA_APP_KEY</code>.</>} />
          <Row name="TCU alumni directory" ok={alumni.available} status={alumni.available ? `Loaded privately on the server: ${alumni.count.toLocaleString()} alumni. Emails are never shown in pages, logged, or sent to AI.` : "Not found on this computer."} setup={!alumni.available && <>Set <code className="t-mono">ALUMNI_DATA_PATH</code> to the spreadsheet&apos;s location. Keep it out of the repository.</>} />
          <Row name="Voice practice (Deepgram)" ok={speechConfigured()} status={speechConfigured() ? "Connected. Spoken interview answers are transcribed word for word, keeping filler words like \"um\" and \"uh\". Audio isn't stored." : "Not configured. Interview practice is typed."} setup={!speechConfigured() && <>Get a key at deepgram.com, then set <code className="t-mono">DEEPGRAM_API_KEY</code>.</>} />
          <Row name="Email and reminders" state="never" status="AGENT FROG never sends email. Outreach opens a draft in your own email app; reminders appear in the app only." />
        </ul>
      </Section>
      <Section title="Profile">
        <div className="panel flex flex-col gap-3 px-4 py-4 @2xl:flex-row @2xl:items-center @2xl:justify-between @2xl:px-5">
          <p className="min-w-0 text-[0.9375rem]">
            Active profile: <span className="font-semibold">{student.fullName}</span>. <span className="text-ink-2">It belongs to this browser only.</span>
          </p>
          <Link href="/start?replace=1" className="btn btn-secondary shrink-0 self-start @2xl:self-auto"><FileUp className="size-4" aria-hidden /> Start over with a new resume</Link>
        </div>
      </Section>
    </div>
  );
}
