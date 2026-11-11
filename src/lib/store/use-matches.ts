"use client";
import { useEffect, useState } from "react";
import type { StudentProfile } from "../domain/types";
import type { MatchResponse } from "../recommendation/service";

/** Fetches ranked matches for the profile; re-fetches when the profile version changes. */
export function useMatches(profile: StudentProfile | null) {
  const [state, setState] = useState<{ data: (MatchResponse & { source: string }) | null; error: string | null; loading: boolean }>({
    data: null,
    error: null,
    loading: false,
  });
  const key = profile ? `${profile.version}:${profile.updatedAt}` : null;

  useEffect(() => {
    if (!profile) return;
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for the fetch below
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch("/api/v1/match", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile }),
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).title ?? "Matching failed");
        return r.json();
      })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((e: Error) => {
        if (e.name !== "AbortError") setState({ data: null, error: e.message, loading: false });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on profile version
  }, [key]);

  return state;
}
