import { SITE_NAME } from "@/lib/site";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="0.55" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#a3e635" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="13" fill="none" stroke="url(#lg)" strokeWidth="2.2" />
      <ellipse cx="16" cy="16" rx="13" ry="5" fill="none" stroke="url(#lg)" strokeWidth="1.2" opacity="0.6" />
      <path d="M16 6 L27 11 L16 16 L5 11 Z" fill="url(#lg)" />
      <path d="M10 13.5 V18 c0 1.6 2.7 3 6 3 s6 -1.4 6 -3 V13.5" fill="none" stroke="url(#lg)" strokeWidth="1.8" />
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="font-display text-lg font-bold tracking-tight">{SITE_NAME}</span>
    </span>
  );
}
