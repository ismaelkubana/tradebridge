import Link from "next/link";
import { register } from "../actions";

export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const resolvedSearchParams = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="mb-1 text-2xl font-bold">Create your account</h1>
        <p className="mb-5 text-sm text-gray-500">Buy from local businesses, or sell on TradeBridge.</p>

        {resolvedSearchParams.error && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{resolvedSearchParams.error}</p>
        )}

        <form action={register} className="space-y-4">
          <div>
            <span className="label">I want to</span>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 p-3 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                <input type="radio" name="role" value="buyer" defaultChecked /> Buy
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 p-3 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                <input type="radio" name="role" value="seller" /> Sell / offer services
              </label>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="full_name">Full name</label>
            <input id="full_name" name="full_name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone (MTN / Airtel)</label>
            <input id="phone" name="phone" type="tel" placeholder="07XXXXXXXX" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" minLength={6} required className="input" />
          </div>
          <button type="submit" className="btn w-full">Create account</button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-700 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
