import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog/queries";
import PlanClient from "./PlanClient";

export const metadata: Metadata = {
  title: "Funding plan",
  description: "See the full cost of a program, the scholarships that could cover it, and loans for the remaining gap.",
};

export default async function PlanPage() {
  const catalog = await getCatalog();
  return <PlanClient universities={catalog.universities} programs={catalog.programs} opportunities={catalog.opportunities} />;
}
