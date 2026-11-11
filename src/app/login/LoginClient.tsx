"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Mail, MailCheck } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { LogoMark } from "@/components/ui/Logo";

export default function LoginClient({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  // Only offer Google when it is switched on in Supabase (Authentication → Providers).
  useEffect(() => {
    if (!configured) return;
    fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } })
      .then((r) => r.json())
      .then((s) => setGoogleEnabled(Boolean(s?.external?.google)))
      .catch(() => setGoogleEnabled(false));
  }, [configured]);
  const sb = getBrowserSupabase();
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback?next=/matches` : undefined;

  const magicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sb) return;
    setBusy(true);
    setError(null);
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  const google = async () => {
    if (!sb) return;
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) setError(error.message);
  };

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-[2rem] p-8">
        <LogoMark className="h-12 w-12" />
        <h1 className="mt-5 font-display text-3xl font-bold">Welcome</h1>
        <p className="mt-1 text-muted">Sign in to save your matches, track applications and get deadline reminders.</p>

        {!configured ? (
          <div className="mt-6 rounded-2xl bg-warn/10 p-4 text-sm text-warn">
            <strong>Demo mode.</strong> Supabase keys aren&apos;t set yet, so sign-in is off. Everything else works and is saved on this
            device. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to{" "}
            <code>.env.local</code>.
            <Link href="/onboarding" className="mt-3 block font-semibold underline">
              Continue as guest →
            </Link>
          </div>
        ) : sent ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-6 rounded-2xl bg-ok/10 p-5 text-center"
          >
            <MailCheck className="mx-auto h-10 w-10 text-ok" />
            <p className="mt-3 font-semibold">Check your inbox</p>
            <p className="mt-1 text-sm text-muted">We sent a sign-in link to {email}.</p>
          </motion.div>
        ) : (
          <>
            {googleEnabled && (
              <>
                <button
                  onClick={google}
                  className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-3 font-semibold text-ink hover:bg-white/90"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                    <path
                      fill="#EA4335"
                      d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.1 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z"
                    />
                  </svg>
                  Continue with Google
                </button>
                <div className="my-5 flex items-center gap-3 text-xs text-muted">
                  <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
                </div>
              </>
            )}
            <form onSubmit={magicLink} className="space-y-3">
              <label className="block">
                <span className="sr-only">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus:border-cyan/60 focus:outline-none"
                />
              </label>
              <button
                disabled={busy}
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                <Mail className="h-4 w-4" /> {busy ? "Sending…" : "Email me a magic link"}
              </button>
            </form>
          </>
        )}
        {error && <p className="mt-4 text-sm text-miss">{error}</p>}
      </motion.div>
    </div>
  );
}
