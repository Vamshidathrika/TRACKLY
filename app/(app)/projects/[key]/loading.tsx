export default function ProjectDetailLoading() {
  return (
    <main className="flex-1 px-8 py-6 animate-pulse overflow-y-auto">
      {/* Breadcrumbs */}
      <div className="h-4 w-48 rounded bg-neutral/60 mb-3" />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-7 w-56 rounded bg-neutral/80 mb-2" />
          <div className="h-4 w-40 rounded bg-neutral/50" />
        </div>
        <div className="h-9 w-28 rounded bg-neutral/70" />
      </div>

      {/* Kanban / List Board Content Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((col) => (
          <div key={col} className="rounded-lg bg-surface border border-border p-3 space-y-3">
            <div className="h-5 w-24 rounded bg-neutral/70 mb-2" />
            <div className="h-20 rounded bg-neutral/40" />
            <div className="h-24 rounded bg-neutral/40" />
            <div className="h-16 rounded bg-neutral/30" />
          </div>
        ))}
      </div>
    </main>
  );
}
