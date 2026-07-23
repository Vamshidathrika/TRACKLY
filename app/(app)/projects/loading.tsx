export default function ProjectsLoading() {
  return (
    <main className="flex-1 px-10 py-6 animate-pulse">
      <div className="h-5 w-24 rounded bg-neutral/60 mb-2" />
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-36 rounded bg-neutral/80" />
        <div className="h-9 w-28 rounded bg-neutral/70" />
      </div>

      <div className="w-full max-w-4xl rounded-lg border border-border bg-surface p-4 space-y-3">
        <div className="h-6 w-full rounded bg-neutral/60 mb-4" />
        <div className="h-10 w-full rounded bg-neutral/40" />
        <div className="h-10 w-full rounded bg-neutral/40" />
        <div className="h-10 w-full rounded bg-neutral/40" />
        <div className="h-10 w-full rounded bg-neutral/30" />
      </div>
    </main>
  );
}
