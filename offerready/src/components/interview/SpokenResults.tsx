import { FILLERS } from "@/domain/interview";
import { Feedback, type AnswerView } from "./PracticeRunner";

const FILLER_RE = new RegExp(`\\b(${FILLERS.map((f) => f.replace(/ /g, "\\s+")).join("|")})\\b`, "gi");

/** The transcript as spoken, with filler words marked so they're easy to spot. */
function Transcript({ text }: { text: string }) {
  const parts = text.split(FILLER_RE);
  return (
    <p className="measure whitespace-pre-line text-[0.9375rem] leading-relaxed">
      {parts.map((p, i) => (i % 2 === 1 ? <mark key={i} className="rounded-[3px] bg-[var(--caution-soft)] px-0.5 text-[var(--caution)]">{p}</mark> : p))}
    </p>
  );
}

/** End-of-session feedback: every question with its latest spoken answer. */
export function SpokenResults({ questions, answers }: { questions: { id: string; text: string }[]; answers: AnswerView[] }) {
  const answered = questions.filter((q) => answers.some((a) => a.questionId === q.id));
  if (!answered.length) return null;
  return (
    <section aria-label="Your answers" className="mt-12 flex flex-col gap-14">
      {questions.map((q, i) => {
        const a = answers.find((x) => x.questionId === q.id);
        if (!a) return null;
        return (
          <article key={q.id} className="flex flex-col gap-5">
            <div className="border-t border-[var(--line)] pt-6">
              <p className="t-num text-[0.8125rem] font-semibold text-[var(--ink-2)]">Question {i + 1} of {questions.length}</p>
              <h2 className="mt-1.5 text-pretty text-[1.3125rem] font-semibold leading-snug tracking-[-0.01em]">{q.text}</h2>
            </div>
            <div className="panel p-5">
              <p className="t-label mb-2">{(a.feedback as { demo?: boolean }).demo ? "Demo answer, written by Claude" : "What you said"}</p>
              <Transcript text={a.answer} />
            </div>
            <Feedback answer={a} title="Feedback" showAnswer={false} />
          </article>
        );
      })}
    </section>
  );
}
