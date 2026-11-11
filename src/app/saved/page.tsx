import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog/queries";
import SavedClient from "./SavedClient";

export const metadata: Metadata = { title: "Saved & tracker", robots: { index: false } };

export default async function SavedPage() {
  const { opportunities } = await getCatalog();
  return <SavedClient opportunities={opportunities} />;
}
