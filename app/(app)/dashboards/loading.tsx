export default function DashboardsLoading() {
  return (
    <main className="flex-1 px-8 py-6 animate-pulse overflow-y-auto">
      <div className="h-5 w-32 rounded bg-neutral/60 mb-2" />
      <div className="h-8 w-48 rounded bg-neutral/80 mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64 rounded-lg border border-border bg-surface p-4 flex flex-col justify-between">
          <div className="h-6 w-36 rounded bg-neutral/70" />
          <div className="h-40 rounded bg-neutral/30" />
        </div>
        <div className="h-64 rounded-lg border border-border bg-surface p-4 flex flex-col justify-between">
          <div className="h-6 w-36 rounded bg-neutral/70" />
          <div className="h-40 rounded bg-neutral/30" />
        </div>
      </div>
    </main>
  );
}
