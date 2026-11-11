import type { Metadata } from "next";
import MatchesClient from "./MatchesClient";

export const metadata: Metadata = { title: "My matches", robots: { index: false } };

export default function MatchesPage() {
  return <MatchesClient />;
}
