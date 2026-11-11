import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import Logo from "./Logo";

export default function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {/* Anti-scam notice (design doc §3.16, P0) */}
        <div className="glass mb-10 flex items-start gap-3 rounded-2xl p-4 text-sm text-muted">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-hidden />
          <p>
            <strong className="text-white">We never charge fees and never ask for bank passwords.</strong> Real scholarships
            don&apos;t either. Always apply through the official link shown on each page.
          </p>
        </div>
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div className="max-w-sm space-y-3">
            <Logo />
            <p className="text-sm text-muted">
              Scholarships, university programs and education loans that fit you — wherever you are in the world.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <Link href="/explore" className="text-muted hover:text-white">Scholarships</Link>
            <Link href="/explore?kind=LOAN" className="text-muted hover:text-white">Education loans</Link>
            <Link href="/universities" className="text-muted hover:text-white">Universities</Link>
            <Link href="/plan" className="text-muted hover:text-white">Funding plan</Link>
            <Link href="/onboarding" className="text-muted hover:text-white">Find my matches</Link>
            <Link href="/login" className="text-muted hover:text-white">Sign in</Link>
          </div>
        </div>
        <p className="mt-10 text-xs text-muted/70">
          Eligibility is decided by transparent rules, not AI. Always confirm details on the provider&apos;s official site.
        </p>
      </div>
    </footer>
  );
}
