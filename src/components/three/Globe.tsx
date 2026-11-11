"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const GlobeScene = dynamic(() => import("./GlobeScene"), { ssr: false });

/** Lightweight CSS globe for slow connections, reduced motion, or while 3D loads. */
export function GlobeFallback() {
  return (
    <div className="grid h-full w-full place-items-center" aria-hidden>
      <div className="relative aspect-square w-[62%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#4c1d95_0%,#1e1b4b_45%,#05060f_75%)] shadow-[0_0_120px_30px_rgba(124,58,237,0.35)]">
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(#a78bfa_1px,transparent_1.5px)] [background-size:14px_14px] opacity-40 [mask-image:radial-gradient(circle,black_55%,transparent_72%)]" />
      </div>
    </div>
  );
}

type Props = { home?: string; targets?: string[]; interactive?: boolean; decorations?: boolean };

/**
 * Decides whether to load WebGL at all (design doc §3.15 "low-bandwidth
 * friendly"): skipped for Save-Data, reduced motion or no WebGL.
 */
export default function Globe(props: Props) {
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
  // Keep the CSS orb underneath until the first WebGL frame, then cross-fade.
  return (
    <div className="relative h-full w-full">
      <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}>
        <GlobeFallback />
      </div>
      <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
        <GlobeScene {...props} onReady={() => setReady(true)} />
      </div>
    </div>
  );
}
