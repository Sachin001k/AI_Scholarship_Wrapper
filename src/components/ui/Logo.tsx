import { SITE_NAME } from "@/lib/site";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#1d4ed8" />
      <path d="M16 8 L26 12.5 L16 17 L6 12.5 Z" fill="#fff" />
      <path d="M10.5 14.5 V19 c0 1.5 2.5 2.8 5.5 2.8 s5.5-1.3 5.5-2.8 V14.5" fill="none" stroke="#fff" strokeWidth="1.8" />
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-base font-semibold tracking-tight text-ink">{SITE_NAME}</span>
    </span>
  );
}
