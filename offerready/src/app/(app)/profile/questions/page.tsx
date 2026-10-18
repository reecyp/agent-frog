import type { Metadata } from "next";
import { Suspense } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { activeStudentId, loadProfile } from "@/server/profile";
import { EmptyState, ListSkeleton, PageHeader, SectionTabs, Section } from "@/components/ui";
import { AnswerForm } from "@/components/profile/AnswerForm";
import { DeepDiveButton } from "@/components/profile/DeepDiveButton";

export const metadata: Metadata = { title: "Detail questions" };

export default function QuestionsPage() {
  return (
    <>
      <PageHeader
        tabs={<SectionTabs group="profile" current="/profile/questions" />}
        title="Detail questions"
        lede="Short questions about things already on your resume: team sizes, results, tools you used. Your answers become confirmed facts that tailoring and cover letters can cite."
        actions={<DeepDiveButton />}
      />
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <Questions />
      </Suspense>
    </>
  );
}

async function Questions() {
  const profile = await loadProfile(await activeStudentId());
  const expName = (id: string | null) => {
    const x = profile.experiences.find((e) => e.id === id);
    return x ? `About ${x.title}, ${x.organization}` : null;
  };
  const deep = profile.answers.filter((a) => a.kind !== "gap");
  const gap = profile.answers.filter((a) => a.kind === "gap");
  const pending = deep.filter((a) => a.state === "pending");
  const done = deep.filter((a) => a.state !== "pending");
  const item = (a: (typeof profile.answers)[number], context: string | null) => (
    <li key={a.id}><AnswerForm answer={{ id: a.id, question: a.question, answer: a.answer, state: a.state, context }} path="/profile/questions" /></li>
  );
  const count = (n: number) => <span className="t-num">{n}</span>;
  return (
    <div className="flex max-w-[46rem] flex-col gap-12">
      <Section title="Waiting for you" aside={pending.length > 0 ? <>{count(pending.length)} open</> : undefined}>
        {pending.length === 0 ? (
          <EmptyState icon={MessageCircleQuestion} title="No open questions" body="Ask for new questions whenever you add experience." />
        ) : (
          <ol className="list">{pending.map((a) => item(a, expName(a.experienceId)))}</ol>
        )}
      </Section>
      {done.length > 0 && (
        <Section title="Answered" aside={<>{count(done.length)} answered</>}>
          <ol className="list">{done.map((a) => item(a, expName(a.experienceId)))}</ol>
        </Section>
      )}
      {gap.length > 0 && (
        <Section title="From job postings" aside={<>{count(gap.length)} {gap.length === 1 ? "question" : "questions"}</>} description="Questions asked while tailoring. Saying you haven't done something keeps it off every future application too.">
          <ol className="list">{gap.map((a) => item(a, a.requirementText ? `Posting: “${a.requirementText}”` : null))}</ol>
        </Section>
      )}
    </div>
  );
}
