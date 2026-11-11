"use client";
import { MotionConfig } from "motion/react";
import { useEffect, useRef } from "react";
import { pullFromSupabase, pushSaved, useUser } from "@/lib/store/session";
import { savedStore } from "@/lib/store/stores";

/** Client-wide providers: motion settings + Supabase sync once signed in. */
export default function Providers({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const synced = useRef<string | null>(null);
  const saved = savedStore.useStore();

  useEffect(() => {
    if (user && synced.current !== user.id) {
      synced.current = user.id;
      pullFromSupabase().catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (user && synced.current === user.id) {
      const t = setTimeout(() => pushSaved().catch(() => {}), 600);
      return () => clearTimeout(t);
    }
  }, [saved, user]);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
