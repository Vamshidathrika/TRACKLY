export default function BacklogLoading() {
  return (
    <main className="flex-1 px-8 py-6 animate-pulse">
      <div className="h-5 w-48 rounded bg-neutral/60 mb-3" />
      <div className="h-8 w-64 rounded bg-neutral/80 mb-6" />
      <div className="space-y-4">
        <div className="h-32 rounded-xl bg-surface border border-border p-4" />
        <div className="h-48 rounded-xl bg-surface border border-border p-4" />
      </div>
    </main>
  );
}
