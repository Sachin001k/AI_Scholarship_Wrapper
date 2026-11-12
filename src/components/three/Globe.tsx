"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";

const GlobeScene = dynamic(() => import("./GlobeScene"), { ssr: false });

/** Lightweight CSS globe for slow connections, reduced motion, or while 3D loads. */
export function GlobeFallback() {
  return (
    <div className="grid h-full w-full place-items-center" aria-hidden>
      <div className="relative aspect-square w-[58%] rounded-full bg-brand-soft ring-1 ring-line">
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(var(--brand)_1px,transparent_1.6px)] [background-size:12px_12px] opacity-40 [mask-image:radial-gradient(circle,black_55%,transparent_72%)]" />
      </div>
    </div>
  );
}

type Props = { home?: string; targets?: string[] };

/**
 * Decides whether to load WebGL at all (design doc §3.15 "low-bandwidth
 * friendly"): skipped for Save-Data, slow 2G, reduced motion or no WebGL.
 */
export default function Globe(props: Props) {
  const theme = useTheme();
  const [mode, setMode] = useState<"pending" | "3d" | "lite">("pending");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const slow = nav.connection?.saveData || ["slow-2g", "2g"].includes(nav.connection?.effectiveType ?? "");
    let webgl = false;
    try {
      webgl = !!document.createElement("canvas").getContext("webgl2");
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time capability probe
    setMode(!reduced && !slow && webgl ? "3d" : "lite");
  }, []);

  if (mode !== "3d") return <GlobeFallback />;
  return (
    <div className="relative h-full w-full">
      <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}>
        <GlobeFallback />
      </div>
      <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
        <GlobeScene {...props} theme={theme} onReady={() => setReady(true)} />
      </div>
    </div>
  );
}
