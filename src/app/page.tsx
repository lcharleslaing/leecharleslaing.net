import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between border-b border-gray-200 pb-5">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Lee Charles Laing
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
        >
          Sign in
        </Link>
      </header>

      <section className="flex flex-1 flex-col justify-center py-20 sm:py-28">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Personal website foundation is running.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
          Next.js, TypeScript, Tailwind CSS, and local Supabase are ready. This is intentionally a simple starting surface so the real site design can be built cleanly next.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Test authentication
          </Link>
          <a
            href="http://127.0.0.1:54323"
            className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold transition hover:bg-gray-50"
          >
            Open Supabase Studio
          </a>
        </div>
      </section>
    </main>
  );
}
