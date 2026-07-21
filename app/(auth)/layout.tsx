export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-100 rounded-ds bg-surface p-8 shadow-[0_8px_16px_-4px_rgba(9,30,66,0.25)]">
        <h1 className="mb-1 text-center text-xl font-semibold text-brand">Trackly</h1>
        {children}
      </div>
    </main>
  );
}
