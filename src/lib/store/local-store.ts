"use client";
import { useSyncExternalStore } from "react";

/**
 * Tiny localStorage-backed store with cross-tab sync. Used for the guest /
 * demo experience; Supabase sync layers on top (see sync.ts).
 */
export function createLocalStore<T>(key: string, initial: T) {
  let cache: T = initial;
  let loaded = false;
  const listeners = new Set<() => void>();

  const read = (): T => {
    if (!loaded && typeof window !== "undefined") {
      loaded = true;
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) cache = JSON.parse(raw) as T;
      } catch {}
    }
    return cache;
  };

  const set = (next: T | ((prev: T) => T)) => {
    cache = typeof next === "function" ? (next as (p: T) => T)(read()) : next;
    try {
      window.localStorage.setItem(key, JSON.stringify(cache));
    } catch {}
    listeners.forEach((l) => l());
  };

  const subscribe = (l: () => void) => {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      loaded = false;
      l();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  };

  function useStore(): T {
    return useSyncExternalStore(subscribe, read, () => initial);
  }

  /** True after hydration, so pages can avoid flashing "empty" states. */
  function useHydrated(): boolean {
    return useSyncExternalStore(
      subscribe,
      () => true,
      () => false,
    );
  }

  return { get: read, set, useStore, useHydrated };
}
