import type { Metadata } from "next";
import { DemoExperience } from "@/demo/DemoExperience";

export const metadata: Metadata = {
  title: "How it works",
  description: "An interactive walkthrough of how AGENT FROG tailors an application. Every name, job and document in it is fictional.",
};

/**
 * The product demo, full screen: its own route group, so none of the app's chrome (sidebar, top
 * bar, route transition) wraps it. Reached by URL only. Everything it draws lives in src/demo/.
 */
export default function DemoPage() {
  return (
    <>
      {/* Keeps keyboard-focused controls clear of the demo's fixed progress chip; applies only while this page is open. */}
      <style>{"html { scroll-padding: 5rem 0 6rem; }"}</style>
      <DemoExperience />
    </>
  );
}
