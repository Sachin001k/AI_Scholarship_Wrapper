import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import Logo from "./Logo";

export default function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div className="max-w-sm space-y-3">
            <Logo />
            {/* Anti-scam notice (design doc §3.16, P0) */}
            <p className="flex items-start gap-2 text-sm text-muted">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
              Free for students. We never charge fees or ask for bank passwords — always apply on the official site.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <Link href="/explore" className="text-muted hover:text-ink">Scholarships</Link>
            <Link href="/explore?kind=LOAN" className="text-muted hover:text-ink">Education loans</Link>
            <Link href="/universities" className="text-muted hover:text-ink">Universities</Link>
            <Link href="/plan" className="text-muted hover:text-ink">Funding plan</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
