// The skeleton's one page. It has no data path, calls no provider and reads no environment
// variable: it exists so that `tsc --noEmit`, the application tests and `next build` have
// something real to check (RFC-2026-029 §8, WP-1A-A0-002).
export const SKELETON_HEADING = 'ThinkBizThai';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-2 p-6">
      <h1 className="text-2xl font-semibold">{SKELETON_HEADING}</h1>
    </main>
  );
}
