"use client";
import type { StudentProfile } from "../domain/types";
import { createLocalStore } from "./local-store";

export const profileStore = createLocalStore<StudentProfile | null>("sw.profile.v1", null);

/** Tracker statuses (design doc §3.9 / §6.10). */
export const APPLICATION_STATUSES = [
  "SAVED",
  "IN_PROGRESS",
  "DOCUMENTS_READY",
  "SUBMITTED",
  "AWARDED",
  "REJECTED",
  "WITHDRAWN",
  "MISSED",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  SAVED: "Saved",
  IN_PROGRESS: "In progress",
  DOCUMENTS_READY: "Documents ready",
  SUBMITTED: "Submitted",
  AWARDED: "Awarded 🎉",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  MISSED: "Missed",
};

/** ApplicationStateMachine: allowed transitions only (§6.10). */
export const TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  SAVED: ["IN_PROGRESS", "WITHDRAWN", "MISSED"],
  IN_PROGRESS: ["DOCUMENTS_READY", "SUBMITTED", "WITHDRAWN", "MISSED"],
  DOCUMENTS_READY: ["SUBMITTED", "WITHDRAWN", "MISSED"],
  SUBMITTED: ["AWARDED", "REJECTED", "WITHDRAWN"],
  AWARDED: [],
  REJECTED: [],
  WITHDRAWN: ["SAVED"],
  MISSED: ["SAVED"],
};

export interface SavedItem {
  slug: string;
  kind: "SCHOLARSHIP" | "LOAN";
  title: string;
  status: ApplicationStatus;
  savedAt: string;
  checklist: Record<string, boolean>;
}

export const savedStore = createLocalStore<Record<string, SavedItem>>("sw.saved.v1", {});

export function toggleSaved(item: Omit<SavedItem, "status" | "savedAt" | "checklist">) {
  savedStore.set((prev) => {
    const next = { ...prev };
    if (next[item.slug]) delete next[item.slug];
    else next[item.slug] = { ...item, status: "SAVED", savedAt: new Date().toISOString(), checklist: {} };
    return next;
  });
}

export function moveStatus(slug: string, to: ApplicationStatus): boolean {
  const cur = savedStore.get()[slug];
  if (!cur || !TRANSITIONS[cur.status].includes(to)) return false;
  savedStore.set((prev) => ({ ...prev, [slug]: { ...cur, status: to } }));
  return true;
}

export function toggleChecklist(slug: string, doc: string) {
  savedStore.set((prev) => {
    const cur = prev[slug];
    if (!cur) return prev;
    return { ...prev, [slug]: { ...cur, checklist: { ...cur.checklist, [doc]: !cur.checklist[doc] } } };
  });
}
