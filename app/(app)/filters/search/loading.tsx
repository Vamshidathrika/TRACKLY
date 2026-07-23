export default function FiltersLoading() {
  return (
    <main className="flex-1 px-8 py-6 animate-pulse">
      <div className="h-5 w-24 rounded bg-neutral/60 mb-2" />
      <div className="h-8 w-40 rounded bg-neutral/80 mb-6" />

      <div className="flex gap-3 mb-6">
        <div className="h-10 w-64 rounded bg-neutral/50" />
        <div className="h-10 w-32 rounded bg-neutral/40" />
        <div className="h-10 w-32 rounded bg-neutral/40" />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
        <div className="h-10 w-full rounded bg-neutral/40" />
        <div className="h-10 w-full rounded bg-neutral/40" />
        <div className="h-10 w-full rounded bg-neutral/30" />
      </div>
    </main>
  );
}
