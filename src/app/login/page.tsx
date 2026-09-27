import Link from "next/link";
import { signIn, signUp } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-12">
      <Link href="/" className="mb-10 text-sm font-medium text-gray-600 hover:text-gray-950">
        ← Back home
      </Link>

      <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm leading-6 text-gray-600">
        Local Supabase authentication is wired into this app.
      </p>

      {params.error ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {params.error}
        </p>
      ) : null}

      {params.message ? (
        <p className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          {params.message}
        </p>
      ) : null}

      <form className="mt-8 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none transition focus:border-gray-950"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={6}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none transition focus:border-gray-950"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button formAction={signIn} className="button-primary px-4 py-3 text-sm">
            Sign in
          </button>
          <button formAction={signUp} className="button-secondary px-4 py-3 text-sm">
            Create account
          </button>
        </div>
      </form>
    </main>
  );
}
