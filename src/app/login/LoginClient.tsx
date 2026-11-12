"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { LogoMark } from "@/components/ui/Logo";

export default function LoginClient({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const sb = getBrowserSupabase();
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback?next=/matches` : undefined;

  // Only offer Google when it is switched on in Supabase (Authentication → Providers).
  useEffect(() => {
    if (!configured) return;
    fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } })
      .then((r) => r.json())
      .then((s) => setGoogleEnabled(Boolean(s?.external?.google)))
      .catch(() => setGoogleEnabled(false));
  }, [configured]);

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
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-12">
      <LogoMark className="h-10 w-10" />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-muted">Keep your matches and saved scholarships on every device.</p>

      {!configured ? (
        <div className="mt-6 rounded-lg bg-warn-soft p-4 text-sm text-warn">
          Sign-in isn&apos;t set up yet. You can still use everything — it&apos;s saved on this device.
          <Link href="/onboarding" className="mt-2 block font-medium underline">
            Continue without signing in
          </Link>
        </div>
      ) : sent ? (
        <div className="card mt-6 p-5 text-center">
          <MailCheck className="mx-auto h-8 w-8 text-ok" />
          <p className="mt-3 font-medium">Check your inbox</p>
          <p className="mt-1 text-sm text-muted">We sent a sign-in link to {email}.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {googleEnabled && (
            <>
              <button onClick={google} className="btn btn-secondary w-full">
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.1 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z"
                  />
                </svg>
                Continue with Google
              </button>
              <p className="text-center text-xs text-muted">or</p>
            </>
          )}
          <form onSubmit={magicLink} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Email</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input" />
            </label>
            <button disabled={busy} className="btn btn-primary w-full">
              {busy ? "Sending…" : "Email me a sign-in link"}
            </button>
          </form>
          <p className="text-xs text-muted">No password needed. We&apos;ll email you a link.</p>
        </div>
      )}
      {error && <p className="mt-4 text-sm text-miss">{error}</p>}
    </div>
  );
}
