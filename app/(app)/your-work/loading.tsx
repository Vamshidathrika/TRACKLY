export default function YourWorkLoading() {
  return (
    <main className="flex-1 px-10 py-6 animate-pulse">
      <div className="h-5 w-32 rounded bg-neutral/60 mb-2" />
      <div className="h-8 w-48 rounded bg-neutral/80 mb-6" />

      {/* Tabs skeleton */}
      <div className="flex gap-4 border-b border-border mb-6">
        <div className="h-8 w-24 rounded-t bg-neutral/70" />
        <div className="h-8 w-24 rounded-t bg-neutral/40" />
        <div className="h-8 w-24 rounded-t bg-neutral/40" />
      </div>

      {/* Content skeleton */}
      <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
        <div className="h-10 w-full rounded bg-neutral/50" />
        <div className="h-10 w-full rounded bg-neutral/40" />
        <div className="h-10 w-full rounded bg-neutral/40" />
        <div className="h-10 w-full rounded bg-neutral/30" />
      </div>
    </main>
  );
}
