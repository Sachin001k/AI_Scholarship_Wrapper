/** Neutral initial "logo" for a university (we don't use real logos/trademarks). */
export default function UniInitial({ name, large }: { name: string; large?: boolean }) {
  const letter = name.replace(/^(University of |The |National University of )/, "")[0];
  return (
    <span className={`grid shrink-0 place-items-center rounded-lg bg-subtle font-semibold text-ink ${large ? "h-14 w-14 text-xl" : "h-10 w-10"}`} aria-hidden>
      {letter}
    </span>
  );
}
