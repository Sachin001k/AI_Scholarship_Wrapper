"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { profileStore, savedStore } from "@/lib/store/stores";
import { useUser } from "@/lib/store/session";
import { getBrowserSupabase } from "@/lib/supabase/client";

const LINKS = [
  { href: "/explore", label: "Scholarships" },
  { href: "/universities", label: "Universities" },
  { href: "/plan", label: "Funding plan" },
  { href: "/saved", label: "Saved" },
];

export default function SiteNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const profile = profileStore.useStore();
  const savedCount = Object.keys(savedStore.useStore()).length;
  const { user } = useUser();
  const active = (href: string) => path === href || path.startsWith(href + "/");
  const cta = profile ? { href: "/matches", label: "My matches" } : { href: "/onboarding", label: "Get started" };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6" aria-label="Main">
        <Link href="/" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active(l.href) ? "page" : undefined}
                className={clsx(
                  "rounded-lg px-3 py-2 text-sm transition-colors",
                  active(l.href) ? "font-medium text-ink" : "text-muted hover:text-ink",
                )}
              >
                {l.label}
                {l.href === "/saved" && savedCount > 0 && <span className="ml-1 text-xs text-brand">({savedCount})</span>}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <button onClick={() => getBrowserSupabase()?.auth.signOut()} className="btn btn-ghost hidden text-sm sm:inline-flex" title={user.email ?? undefined}>
              Sign out
            </button>
          ) : (
            <Link href="/login" className="btn btn-ghost hidden text-sm sm:inline-flex">
              Sign in
            </Link>
          )}
          <Link href={cta.href} className="btn btn-primary hidden text-sm sm:inline-flex">
            {cta.label}
          </Link>
          <button
            className="rounded-lg p-2 text-ink md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-line bg-surface md:hidden">
          <ul className="space-y-1 px-4 py-3">
            {[cta, ...LINKS, user ? null : { href: "/login", label: "Sign in" }].filter(Boolean).map((l) => (
              <li key={l!.href}>
                <Link
                  href={l!.href}
                  onClick={() => setOpen(false)}
                  className={clsx("block rounded-lg px-3 py-3 text-base", active(l!.href) ? "bg-subtle font-medium" : "text-ink")}
                >
                  {l!.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
