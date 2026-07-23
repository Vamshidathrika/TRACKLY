export default function AppRootLoading() {
  return (
    <div className="flex-1 px-8 py-6 animate-pulse">
      <div className="h-6 w-36 rounded bg-neutral/60 mb-4" />
      <div className="h-8 w-64 rounded bg-neutral/80 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="h-28 rounded-lg bg-surface border border-border p-4 flex flex-col justify-between">
          <div className="h-4 w-24 rounded bg-neutral/60" />
          <div className="h-8 w-16 rounded bg-neutral/80" />
        </div>
        <div className="h-28 rounded-lg bg-surface border border-border p-4 flex flex-col justify-between">
          <div className="h-4 w-24 rounded bg-neutral/60" />
          <div className="h-8 w-16 rounded bg-neutral/80" />
        </div>
        <div className="h-28 rounded-lg bg-surface border border-border p-4 flex flex-col justify-between">
          <div className="h-4 w-24 rounded bg-neutral/60" />
          <div className="h-8 w-16 rounded bg-neutral/80" />
        </div>
      </div>
      <div className="rounded-lg border border-border bg-surface p-6 space-y-4">
        <div className="h-6 w-48 rounded bg-neutral/80 mb-4" />
        <div className="h-10 w-full rounded bg-neutral/40" />
        <div className="h-10 w-full rounded bg-neutral/40" />
        <div className="h-10 w-full rounded bg-neutral/40" />
      </div>
    </div>
  );
}
