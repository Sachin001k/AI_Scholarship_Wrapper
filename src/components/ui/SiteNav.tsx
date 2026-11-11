"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bookmark, Compass, GraduationCap, Menu, PiggyBank, Sparkles, X } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import Logo from "./Logo";
import { profileStore, savedStore } from "@/lib/store/stores";
import { useUser } from "@/lib/store/session";
import { getBrowserSupabase } from "@/lib/supabase/client";

const LINKS = [
  { href: "/matches", label: "My matches", icon: Sparkles },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/universities", label: "Universities", icon: GraduationCap },
  { href: "/plan", label: "Funding plan", icon: PiggyBank },
  { href: "/saved", label: "Saved", icon: Bookmark },
];

export default function SiteNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const profile = profileStore.useStore();
  const saved = savedStore.useStore();
  const { user } = useUser();
  const savedCount = Object.keys(saved).length;

  const active = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink/60 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6" aria-label="Main">
        <Link href="/" className="shrink-0" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href} className="relative">
              <Link
                href={l.href}
                className={clsx(
                  "relative z-10 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition-colors",
                  active(l.href) ? "text-white" : "text-muted hover:text-white",
                )}
              >
                <l.icon className="h-4 w-4" aria-hidden />
                {l.label}
                {l.href === "/saved" && savedCount > 0 && (
                  <span className="ml-0.5 rounded-full bg-violet/80 px-1.5 text-[10px] font-semibold text-white">{savedCount}</span>
                )}
              </Link>
              {active(l.href) && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-white/15"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={() => getBrowserSupabase()?.auth.signOut()}
              className="hidden rounded-full px-3 py-2 text-sm text-muted hover:text-white sm:block"
              title={user.email ?? undefined}
            >
              Sign out
            </button>
          ) : (
            <Link href="/login" className="hidden rounded-full px-3 py-2 text-sm text-muted hover:text-white sm:block">
              Sign in
            </Link>
          )}
          <Link
            href={profile ? "/matches" : "/onboarding"}
            className="btn-primary hidden rounded-full px-4 py-2 text-sm font-semibold text-white sm:block"
          >
            {profile ? "See my matches" : "Start free"}
          </Link>
          <button
            className="rounded-full p-2 text-white lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-white/5 lg:hidden"
          >
            <ul className="space-y-1 px-4 py-4">
              {LINKS.map((l, i) => (
                <motion.li key={l.href} initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={clsx(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-base",
                      active(l.href) ? "bg-white/10 text-white" : "text-muted",
                    )}
                  >
                    <l.icon className="h-5 w-5" /> {l.label}
                  </Link>
                </motion.li>
              ))}
              <li className="pt-2">
                <Link
                  href={user ? "/matches" : "/login"}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 text-muted"
                >
                  {user ? `Signed in as ${user.email}` : "Sign in to save across devices"}
                </Link>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
