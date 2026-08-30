"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function PasswordReset({ update = false }: { update?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const supabase = createClient();
      if (update) {
        const password = String(form.get("password") ?? "");
        if (password.length < 10) throw new Error("Use at least 10 characters for your new password.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        router.replace("/dashboard");
        router.refresh();
      } else {
        const email = String(form.get("email") ?? "").trim().toLowerCase();
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/update-password` });
        if (error) throw error;
        setMessage("If an account exists for that email, a secure reset link is on its way.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The request could not be completed.");
    } finally {
      setPending(false);
    }
  }
  return <form className="auth-form" onSubmit={submit}>{update ? <label>New password <input name="password" type="password" minLength={10} autoComplete="new-password" required /></label> : <label>Email <input name="email" type="email" autoComplete="email" required /></label>}<button className="button" disabled={pending}>{pending ? "Working…" : update ? "Set new password" : "Send reset link"}</button><div className="form-message" role="status" aria-live="polite">{message}</div></form>;
}
