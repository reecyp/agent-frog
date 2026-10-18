import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { and, desc, eq, gte, inArray, ne } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { activeStudentId } from "@/server/profile";
import { aiConfigured } from "@/server/ai/claude";
import { speechConfigured } from "@/server/speech";
import { Keyboard, Mic, MessagesSquare } from "lucide-react";
import { BackLink } from "@/components/shell/BackLink";
import { EmptyState, ListSkeleton, Section } from "@/components/ui";
import { PracticeRunner, type AnswerView } from "@/components/interview/PracticeRunner";
import { StartSessionButton } from "@/components/interview/StartSession";
import { VoiceSession } from "@/components/interview/VoiceSession";
import { SpokenResults } from "@/components/interview/SpokenResults";
import { QUESTION_FOCUSES, type QuestionFocus } from "@/domain/interview";

export const metadata: Metadata = { title: "Interview practice" };

/** The question types a saved set used, so the checkboxes start where the student left them. */
const focusesOf = (questions: { kind: string }[]) => {
  const kinds = new Set(questions.map((q) => (q.kind === "motivation" ? "behavioral" : q.kind)));
  const used = QUESTION_FOCUSES.filter((f: QuestionFocus) => kinds.has(f));
  return used.length ? used : QUESTION_FOCUSES;
};

export default function PracticePage({ params }: PageProps<"/interview/[appId]">) {
  return (
    <Suspense fallback={<div className="max-w-[44rem]"><ListSkeleton rows={2} /></div>}>
      <Practice params={params} />
    </Suspense>
  );
}

async function Practice({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  const studentId = await activeStudentId();
  const db = await getDb();
  const [row] = await db.select({ app: schema.applications, job: schema.jobs }).from(schema.applications).innerJoin(schema.jobs, eq(schema.jobs.id, schema.applications.jobId))
    .where(and(eq(schema.applications.id, appId), eq(schema.applications.studentId, studentId)));
  if (!row) notFound();
  const [session] = await db.select().from(schema.interviewSessions).where(eq(schema.interviewSessions.applicationId, appId)).orderBy(desc(schema.interviewSessions.createdAt)).limit(1);
  const answers = session ? await db.select().from(schema.interviewAnswers).where(eq(schema.interviewAnswers.sessionId, session.id)).orderBy(desc(schema.interviewAnswers.createdAt)) : [];

  // Strong answers from other roles, to reuse as stories. Demo answers are Claude's, not the student's, so they never count.
  const otherSessions = await db.select({ id: schema.interviewSessions.id, questions: schema.interviewSessions.questions, appId: schema.interviewSessions.applicationId })
    .from(schema.interviewSessions).where(and(eq(schema.interviewSessions.studentId, studentId), ne(schema.interviewSessions.applicationId, appId)));
  const stories = otherSessions.length
    ? await db.select({ a: schema.interviewAnswers, job: schema.jobs }).from(schema.interviewAnswers)
        .innerJoin(schema.interviewSessions, eq(schema.interviewSessions.id, schema.interviewAnswers.sessionId))
        .innerJoin(schema.applications, eq(schema.applications.id, schema.interviewSessions.applicationId))
        .innerJoin(schema.jobs, eq(schema.jobs.id, schema.applications.jobId))
        .where(and(inArray(schema.interviewAnswers.sessionId, otherSessions.map((s) => s.id)), gte(schema.interviewAnswers.rating, 3.75)))
        .then((rows) => rows.filter(({ a }) => !(a.feedback as { demo?: boolean }).demo).slice(0, 4))
    : [];

  const voice = speechConfigured();
  const views: AnswerView[] = answers.map((a) => ({ id: a.id, questionId: a.questionId, answer: a.answer, durationSeconds: a.durationSeconds, rating: a.rating, feedback: a.feedback, createdAt: a.createdAt.toISOString() }));

  return (
    <article className="max-w-[44rem]">
      <BackLink fallbackHref="/interview" fallbackLabel="interview practice" />
      <header className="mb-6">
        <h1 className="t-title text-balance break-words">{row.job.title}</h1>
        <p className="mt-1.5 text-[0.9375rem] text-[var(--ink-2)]"><span className="font-semibold text-[var(--ink)]">{row.job.company}</span>. Questions come from this posting and your profile.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <StartSessionButton applicationId={appId} hasSession={!!session} initial={session ? focusesOf(session.questions) : undefined} />
        </div>
      </header>
      <p className="mb-8 flex gap-2.5 rounded-[var(--r-panel)] border border-[var(--line)] bg-[var(--bg-subtle)] px-4 py-3 text-[0.875rem] text-[var(--ink-2)]">
        {voice ? <Mic className="mt-0.5 size-4 shrink-0 text-[var(--ink-3)]" aria-hidden /> : <Keyboard className="mt-0.5 size-4 shrink-0 text-[var(--ink-3)]" aria-hidden />}
        <span>
          {voice
            ? "Answer out loud. Your answers are transcribed word for word by Deepgram, keeping \"um\" and \"uh\", and the audio isn't stored."
            : "Type your answer as you'd say it. Spoken practice needs DEEPGRAM_API_KEY in .env.local."}
          {aiConfigured() ? " Claude gives the feedback." : " Feedback is rule-based (no AI key): it checks structure, specificity and length, and points to your own evidence."}
        </span>
      </p>

      {!session ? (
        <EmptyState icon={MessagesSquare} title="No questions yet" body="Start practice to get five questions written for this role." />
      ) : (
        voice ? (
          <>
            <VoiceSession key={session.id} sessionId={session.id} questions={session.questions.map((q) => ({ id: q.id, text: q.text }))} />
            <SpokenResults questions={session.questions} answers={views} />
          </>
        ) : (
          <PracticeRunner sessionId={session.id} questions={session.questions} answers={views} />
        )
      )}

      {stories.length > 0 && (
        <Section title="Strong stories from other practice" description="Answers rated well for other roles. Reuse them where they fit." className="mt-12">
          <ul className="list">
            {stories.map(({ a, job }) => (
              <li key={a.id} className="list-row">
                <p className="t-meta">From your {job.company} practice, rated <span className="t-num">{a.rating}</span></p>
                <p className="mt-1 line-clamp-3 text-[0.875rem]">{a.answer}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </article>
  );
}
