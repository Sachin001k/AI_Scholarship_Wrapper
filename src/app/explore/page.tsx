import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog/queries";
import ExploreClient from "./ExploreClient";

export const metadata: Metadata = {
  title: "Explore scholarships & education loans",
  description: "Browse merit-based, need-based and university-specific scholarships and international student loans worldwide.",
};

export default async function ExplorePage() {
  const { opportunities } = await getCatalog();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-bold sm:text-5xl">
        Explore <span className="text-gradient">funding</span>
      </h1>
      <p className="mt-2 max-w-2xl text-muted">
        Every scholarship and loan we track. Want to know which ones you qualify for? Get your personal matches in two minutes.
      </p>
      <ExploreClient opportunities={opportunities} />
    </div>
  );
}
