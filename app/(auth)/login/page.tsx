import Link from "next/link";
import { login } from "../actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="mb-1 text-2xl font-bold">Sign in</h1>
        <p className="mb-5 text-sm text-gray-500">Welcome back.</p>

        {resolvedSearchParams.error && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{resolvedSearchParams.error}</p>
        )}
        {resolvedSearchParams.message && (
          <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{resolvedSearchParams.message}</p>
        )}

        <form action={login} className="space-y-4">
          <input type="hidden" name="next" value={resolvedSearchParams.next ?? "/"} />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required className="input" />
          </div>
          <button type="submit" className="btn w-full">Sign in</button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          New here?{" "}
          <Link href="/register" className="font-medium text-brand-700 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
