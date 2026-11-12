import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog } from "@/lib/catalog/queries";
import ExploreClient from "./ExploreClient";

export const metadata: Metadata = {
  title: "Scholarships & education loans",
  description: "Browse merit-based, need-based and university scholarships and international student loans worldwide.",
};

export default async function ExplorePage() {
  const { opportunities } = await getCatalog();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Scholarships & loans</h1>
      <p className="mt-2 text-muted">
        Everything we track.{" "}
        <Link href="/onboarding" className="font-medium text-brand hover:underline">
          Answer a few questions
        </Link>{" "}
        to see only the ones you qualify for.
      </p>
      <ExploreClient opportunities={opportunities} />
    </div>
  );
}
