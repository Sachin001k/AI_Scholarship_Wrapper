import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-8xl font-black text-gradient">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold">This page took a gap year.</h1>
      <p className="mt-2 text-muted">It may have closed or moved. Let&apos;s find you something better.</p>
      <Link href="/explore" className="btn-primary mt-8 rounded-full px-6 py-3 font-semibold text-white">Explore funding</Link>
    </div>
  );
}
