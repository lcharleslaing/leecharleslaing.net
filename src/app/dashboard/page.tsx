import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const email = typeof data.claims.email === "string" ? data.claims.email : "Authenticated user";

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <p className="text-sm text-gray-500">Protected route</p>
          <h1 className="mt-1 text-xl font-semibold">Dashboard</h1>
        </div>
        <form action={signOut}>
          <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-50">
            Sign out
          </button>
        </form>
      </header>

      <section className="py-12">
        <h2 className="text-2xl font-semibold tracking-tight">Authentication is working.</h2>
        <p className="mt-3 text-gray-600">Signed in as {email}</p>
      </section>
    </main>
  );
}
