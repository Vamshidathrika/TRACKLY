export default function SummaryLoading() {
  return (
    <main className="flex-1 px-8 py-6 animate-pulse">
      <div className="h-5 w-48 rounded bg-neutral/60 mb-3" />
      <div className="h-8 w-64 rounded bg-neutral/80 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="h-28 rounded-xl bg-surface border border-border p-4" />
        <div className="h-28 rounded-xl bg-surface border border-border p-4" />
        <div className="h-28 rounded-xl bg-surface border border-border p-4" />
      </div>
      <div className="h-64 rounded-xl bg-surface border border-border p-4" />
    </main>
  );
}
