"use client";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import clsx from "clsx";
import type { Opportunity } from "@/lib/domain/types";
import { formatDeadline } from "@/lib/domain/values";
import { STATUS_LABEL, TRANSITIONS, moveStatus, savedStore, toggleChecklist, toggleSaved, type ApplicationStatus } from "@/lib/store/stores";
import { profileStore } from "@/lib/store/stores";
import { useUser } from "@/lib/store/session";
import { DeadlineChip, opportunityHref } from "@/components/ui/opportunity";

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  SAVED: "bg-subtle text-muted",
  IN_PROGRESS: "bg-brand-soft text-brand",
  DOCUMENTS_READY: "bg-brand-soft text-brand",
  SUBMITTED: "bg-brand-soft text-brand-ink",
  AWARDED: "bg-ok-soft text-ok",
  REJECTED: "bg-miss-soft text-miss",
  WITHDRAWN: "bg-subtle text-muted",
  MISSED: "bg-subtle text-muted",
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
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Saved</h1>
      <p className="mt-2 text-muted">Your shortlist. Update the status as you go and tick off documents.</p>
      {!user && items.length > 0 && (
        <p className="mt-4 text-sm text-muted">
          Saved on this device only.{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>{" "}
          to keep them everywhere.
        </p>
      )}

      {items.length === 0 ? (
        <div className="card mt-8 p-8 text-center">
          <p className="text-muted">Nothing saved yet. Tap the bookmark on any scholarship to add it here.</p>
          <Link href="/matches" className="btn btn-primary mt-5">
            See my matches
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((it) => {
            const o = bySlug.get(it.slug);
            const done = o ? o.documents.filter((d) => it.checklist[d]).length : 0;
            const next = TRANSITIONS[it.status];
            return (
              <li key={it.slug} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={opportunityHref(it)} className="font-semibold hover:text-brand">
                      {it.title}
                    </Link>
                    {o && (
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                        <DeadlineChip deadline={o.deadline} zone={profile?.timeZone} />
                        {o.deadline.kind === "FIXED" && <span>{formatDeadline(o.deadline, profile?.timeZone)}</span>}
                      </p>
                    )}
                  </div>
                  <button onClick={() => toggleSaved(it)} aria-label={`Remove ${it.title}`} className="rounded-lg p-2 text-muted hover:bg-subtle hover:text-miss">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <span className={clsx("badge", STATUS_STYLE[it.status])}>{STATUS_LABEL[it.status]}</span>
                  {next.length > 0 && (
                    <label className="flex items-center gap-2 text-muted">
                      <span className="sr-only">Change status</span>
                      <select
                        value=""
                        onChange={(e) => e.target.value && moveStatus(it.slug, e.target.value as ApplicationStatus)}
                        className="input w-auto py-1 text-sm"
                      >
                        <option value="">Update status…</option>
                        {next.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                {o && o.documents.length > 0 && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-brand">
                      Documents · {done}/{o.documents.length} ready
                    </summary>
                    <ul className="mt-3 space-y-2">
                      {o.documents.map((d) => (
                        <li key={d}>
                          <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input type="checkbox" className="h-4 w-4 accent-[#1d4ed8]" checked={!!it.checklist[d]} onChange={() => toggleChecklist(it.slug, d)} />
                            <span className={clsx(it.checklist[d] && "text-muted line-through")}>{d}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
