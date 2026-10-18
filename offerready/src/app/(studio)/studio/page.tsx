import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { activeStudentId, getStudent } from "@/server/profile";
import { loadOverview } from "@/server/overview";
import { Skeleton } from "@/components/ui";
import { StudioBoxes } from "@/components/studio/StudioBoxes";

export const metadata: Metadata = { title: "Your studio" };

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-8 pt-6">
          <Skeleton className="h-12 w-80" />
          <Skeleton className="h-[27rem] w-full" />
        </div>
      }
    >
      <Studio />
    </Suspense>
  );
}

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

async function Studio() {
  const studentId = await activeStudentId();
  const [student, data] = await Promise.all([getStudent(studentId), loadOverview(studentId)]);
  const first = student.fullName.split(" ")[0];
  const named = first && first !== "New";
  const open = data.apps.filter((a) => !["accepted", "rejected", "withdrawn"].includes(a.app.status)).length;
  // Only the single most urgent item, and only when there is one: the boxes are the page.
  const next = data.actions.find((a) => a.urgency < 5);

  return (
    <div className="mx-auto max-w-[72rem] pt-2 sm:pt-6">
      <header className="mb-10 sm:mb-14">
        <h1 className="t-title">{greeting(new Date().getHours())}{named ? `, ${first}.` : "."}</h1>
        {next ? (
          <p className="mt-3 text-[0.95rem] text-[var(--ink-2)]">
            {next.title}.{" "}
            <Link href={next.href} className="font-semibold text-[var(--frog-text)] underline decoration-[var(--frog-text)]/40 underline-offset-4 hover:decoration-[var(--frog-text)]">
              {next.cta}
            </Link>
          </p>
        ) : (
          <p className="mt-3 text-[0.95rem] text-[var(--ink-2)]">{data.apps.length ? "Nothing needs you right now." : "Start in Jobs with a role you want."}</p>
        )}
      </header>

      <nav aria-label="Workspaces">
        <StudioBoxes
          boxes={[
            { href: "/discover", name: "Jobs", detail: "Find real openings, then tailor a resume and cover letter to each one.", primary: true, photo: "/studio/cutting-table.webp", photoPosition: "50% 40%" },
            { href: "/applications", name: "Applications", detail: open ? `${open} in progress` : "None yet", photo: "/studio/shop-green.webp", photoPosition: "50% 40%" },
            { href: "/interview", name: "Interview", detail: "Practice questions out loud or in writing.", photo: "/studio/shears.webp", photoPosition: "60% 30%" },
            { href: "/network", name: "Network", detail: "TCU alumni at the companies you're targeting.", photo: "/entrance/drinkwaters.webp", photoPosition: "50% 45%" },
          ]}
        />
      </nav>
    </div>
  );
}
