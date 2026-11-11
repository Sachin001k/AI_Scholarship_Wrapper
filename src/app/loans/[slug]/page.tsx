import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog, getOpportunity } from "@/lib/catalog/queries";
import OpportunityDetail from "@/components/OpportunityDetail";

export async function generateStaticParams() {
  const { opportunities } = await getCatalog();
  return opportunities.filter((o) => o.kind === "LOAN").map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({ params }: PageProps<"/loans/[slug]">): Promise<Metadata> {
  const o = await getOpportunity((await params).slug);
  if (!o || o.kind !== "LOAN") return {};
  return {
    title: o.title,
    description: o.summary,
    alternates: { canonical: `/loans/${o.slug}` },
    openGraph: { title: o.title, description: o.summary },
  };
}

export default async function Page({ params }: PageProps<"/loans/[slug]">) {
  const o = await getOpportunity((await params).slug);
  if (!o || o.kind !== "LOAN") notFound();
  const { universities } = await getCatalog();
  return <OpportunityDetail o={o} universities={universities} />;
}
