"use client";
import { useSyncExternalStore } from "react";
import { THEME_KEY } from "./theme-boot";

/**
 * Light / dark theme. Default follows the device ("system"); a manual choice is
 * remembered. The <head> script in layout.tsx applies it before first paint.
 */
export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function readMode(): ThemeMode {
  try {
    const m = localStorage.getItem(THEME_KEY);
    return m === "light" || m === "dark" ? m : "system";
  } catch {
    return "system";
  }
}

function resolve(mode: ThemeMode): ResolvedTheme {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply() {
  document.documentElement.dataset.theme = resolve(readMode());
}

export function setThemeMode(mode: ThemeMode) {
  try {
    if (mode === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, mode);
  } catch {}
  apply();
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (readMode() === "system") apply();
    l();
  };
  mq.addEventListener("change", onChange);
  return () => {
    listeners.delete(l);
    mq.removeEventListener("change", onChange);
  };
}

/** Current resolved theme ("light" on the server and before hydration). */
export function useTheme(): ResolvedTheme {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => "light",
  );
}
