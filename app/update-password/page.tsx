"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("Verifying your secure reset link…");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function verifyLink() {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (active) setMessage("This reset link is invalid or has expired. Request a new password-reset email.");
          return;
        }
      }

      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error || !data.session) {
        setMessage("This reset link could not be verified or has expired. Request a new password-reset email.");
        return;
      }
      setReady(true);
      setMessage("");
    }

    void verifyLink();
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (password.length < 10) {
      setMessage("Use at least 10 characters for your new password.");
      return;
    }
    if (password !== confirm) {
      setMessage("The passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMessage("The password could not be updated. Request a new reset link and try again.");
      return;
    }
    setPassword("");
    setConfirm("");
    setReady(false);
    setMessage("Password updated successfully. You can now sign in with your new password.");
  }

  return (
    <main className="mx-auto max-w-md">
      <div className="card">
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <p className="mt-2 text-sm text-gray-600">Use the secure reset link sent to your email. TradeBridge staff cannot see your new password.</p>
        {ready ? (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="label" htmlFor="new-password">New password</label>
              <input id="new-password" type="password" autoComplete="new-password" minLength={10} required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="confirm-password">Confirm new password</label>
              <input id="confirm-password" type="password" autoComplete="new-password" minLength={10} required className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <button type="submit" className="btn w-full" disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
          </form>
        ) : null}
        {message && <p role="status" className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{message}</p>}
      </div>
    </main>
  );
}
