"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Bookmark, CheckSquare, Square, Trash2 } from "lucide-react";
import clsx from "clsx";
import type { Opportunity } from "@/lib/domain/types";
import { formatDeadline } from "@/lib/domain/values";
import {
  APPLICATION_STATUSES,
  STATUS_LABEL,
  TRANSITIONS,
  moveStatus,
  savedStore,
  toggleChecklist,
  toggleSaved,
  type ApplicationStatus,
} from "@/lib/store/stores";
import { profileStore } from "@/lib/store/stores";
import { useUser } from "@/lib/store/session";
import { DeadlineChip, opportunityHref } from "@/components/ui/opportunity";

const STATUS_COLOR: Record<ApplicationStatus, string> = {
  SAVED: "bg-white/10",
  IN_PROGRESS: "bg-violet/30",
  DOCUMENTS_READY: "bg-cyan/25",
  SUBMITTED: "bg-blue-500/30",
  AWARDED: "bg-ok/30",
  REJECTED: "bg-miss/25",
  WITHDRAWN: "bg-white/5",
  MISSED: "bg-white/5",
};

export default function SavedClient({ opportunities }: { opportunities: Opportunity[] }) {
  const saved = savedStore.useStore();
  const hydrated = savedStore.useHydrated();
  const profile = profileStore.useStore();
  const { user } = useUser();
  const bySlug = new Map(opportunities.map((o) => [o.slug, o]));
  const items = Object.values(saved).sort((a, b) => a.savedAt.localeCompare(b.savedAt));

  if (!hydrated) return <div className="min-h-[60vh]" />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-bold sm:text-5xl">
        Saved <span className="text-gradient">& tracker</span>
      </h1>
      <p className="mt-2 text-muted">Move each application forward and tick off documents as you go.</p>
      {!user && items.length > 0 && (
        <p className="mt-4 rounded-2xl bg-white/5 p-4 text-sm text-muted ring-1 ring-white/10">
          Saved on this device only. <Link href="/login" className="text-cyan underline">Sign in</Link> to keep them across devices and get deadline reminders.
        </p>
      )}

      {items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <Bookmark className="h-12 w-12 text-muted" />
          <p className="mt-4 text-muted">Nothing saved yet. Tap the ♥ on any scholarship or loan.</p>
          <Link href="/matches" className="btn-primary mt-6 rounded-full px-6 py-3 font-semibold text-white">See my matches</Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          <AnimatePresence>
            {items.map((it) => {
              const o = bySlug.get(it.slug);
              const done = o ? o.documents.filter((d) => it.checklist[d]).length : 0;
              return (
                <motion.li key={it.slug} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }} className="glass rounded-3xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link href={opportunityHref(it)} className="font-display text-lg font-semibold hover:underline">{it.title}</Link>
                      {o && (
                        <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                          <DeadlineChip deadline={o.deadline} zone={profile?.timeZone} />
                          {o.deadline.kind === "FIXED" && <span>{formatDeadline(o.deadline, profile?.timeZone)}</span>}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", STATUS_COLOR[it.status])}>{STATUS_LABEL[it.status]}</span>
                      <button onClick={() => toggleSaved(it)} aria-label={`Remove ${it.title}`} className="rounded-full p-2 text-muted hover:bg-white/10 hover:text-miss">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Status pipeline: only allowed transitions are clickable (state machine) */}
                  <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
                    {APPLICATION_STATUSES.slice(0, 6).map((s) => {
                      const idx = APPLICATION_STATUSES.indexOf(s);
                      const reached = APPLICATION_STATUSES.indexOf(it.status) >= idx && it.status !== "WITHDRAWN" && it.status !== "MISSED";
                      const allowed = TRANSITIONS[it.status].includes(s);
                      return (
                        <button
                          key={s}
                          disabled={!allowed}
                          onClick={() => moveStatus(it.slug, s)}
                          className={clsx(
                            "whitespace-nowrap rounded-full px-3 py-1.5 text-xs ring-1 transition-colors",
                            s === it.status ? "bg-gradient-to-r from-violet to-cyan text-white ring-transparent" : reached ? "bg-white/10 ring-white/10" : "ring-white/10",
                            allowed ? "cursor-pointer text-white hover:bg-white/15" : "cursor-default text-muted",
                          )}
                        >
                          {STATUS_LABEL[s]}
                        </button>
                      );
                    })}
                  </div>

                  {o && o.documents.length > 0 && (
                    <details className="mt-4 group">
                      <summary className="cursor-pointer text-sm text-cyan">
                        Document checklist · {done}/{o.documents.length}
                      </summary>
                      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                        {o.documents.map((d) => (
                          <li key={d}>
                            <button onClick={() => toggleChecklist(it.slug, d)} className="flex w-full items-center gap-2 rounded-xl bg-white/5 p-2.5 text-left text-sm hover:bg-white/10">
                              {it.checklist[d] ? <CheckSquare className="h-4 w-4 text-ok" /> : <Square className="h-4 w-4 text-muted" />}
                              <span className={clsx(it.checklist[d] && "text-muted line-through")}>{d}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
