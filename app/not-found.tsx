import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <h1 className="text-2xl font-medium">Page not found</h1>
      <p className="text-sm text-text-subtle">The page you are looking for does not exist.</p>
      <Link href="/your-work" className="text-sm text-brand hover:underline">Go to Trackly</Link>
    </main>
  );
}
