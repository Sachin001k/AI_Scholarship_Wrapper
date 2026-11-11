import type { Metadata } from "next";
import OnboardingWizard from "./OnboardingWizard";

export const metadata: Metadata = {
  title: "Find your matches",
  description: "Answer a few quick questions to see the scholarships and loans you qualify for.",
  robots: { index: false },
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
