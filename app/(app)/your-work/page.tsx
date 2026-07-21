export default function YourWorkPage() {
  return (
    <main className="flex-1 px-10 py-6">
      <h1 className="mb-6 text-2xl font-medium">Your work</h1>
      <div className="flex border-b border-border text-sm font-medium text-text-subtle">
        {["Worked on", "Viewed", "Assigned to me", "Starred"].map((tab, i) => (
          <span key={tab} className={`px-3 pb-2 ${i === 2 ? "border-b-2 border-brand text-brand" : ""}`}>
            {tab}{i === 2 ? " 0" : ""}
          </span>
        ))}
      </div>
      <div className="mt-16 flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-medium">You currently have no work assigned to you.</p>
        <p className="text-sm text-text-subtle">Issues assigned to you will appear here once projects exist.</p>
      </div>
    </main>
  );
}
