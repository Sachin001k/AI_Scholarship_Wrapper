import type { Metadata } from "next";
import LoginClient from "./LoginClient";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage() {
  return <LoginClient configured={isSupabaseConfigured} />;
}
