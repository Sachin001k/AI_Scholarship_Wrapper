import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog, getOpportunity } from "@/lib/catalog/queries";
import OpportunityDetail from "@/components/OpportunityDetail";

export async function generateStaticParams() {
  const { opportunities } = await getCatalog();
  return opportunities.filter((o) => o.kind === "SCHOLARSHIP").map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({ params }: PageProps<"/scholarships/[slug]">): Promise<Metadata> {
  const o = await getOpportunity((await params).slug);
  if (!o || o.kind !== "SCHOLARSHIP") return {};
  return {
    title: o.title,
    description: o.summary,
    alternates: { canonical: `/scholarships/${o.slug}` },
    openGraph: { title: o.title, description: o.summary },
  };
}

export default async function Page({ params }: PageProps<"/scholarships/[slug]">) {
  const o = await getOpportunity((await params).slug);
  if (!o || o.kind !== "SCHOLARSHIP") notFound();
  const { universities } = await getCatalog();
  return <OpportunityDetail o={o} universities={universities} />;
}
