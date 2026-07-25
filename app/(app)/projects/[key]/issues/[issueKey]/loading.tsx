export default function IssueDetailLoading() {
  return (
    <main className="flex-1 px-8 py-6 animate-pulse">
      <div className="h-5 w-48 rounded bg-neutral/60 mb-3" />
      <div className="h-8 w-96 rounded bg-neutral/80 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <div className="h-32 rounded-xl bg-surface border border-border p-4" />
          <div className="h-48 rounded-xl bg-surface border border-border p-4" />
        </div>
        <div className="h-64 rounded-xl bg-surface border border-border p-4" />
      </div>
    </main>
  );
}
