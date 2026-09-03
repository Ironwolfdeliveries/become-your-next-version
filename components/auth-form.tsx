"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { persistPendingVersionSnapshot } from "@/lib/supabase/snapshot";

type Mode = "signup" | "signin";

function readableAuthError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login")) return "That email and password combination was not recognized.";
  if (lower.includes("already registered")) return "An account already exists for that email. Sign in instead.";
  if (lower.includes("password")) return message;
  if (lower.includes("rate limit")) return "Too many attempts. Please wait a moment and try again.";
  return "We could not complete that request. Check your information and try again.";
}

export function AuthForm({ mode, redirectTo }: { mode: Mode; redirectTo?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const isSignup = mode === "signup";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const displayName = String(form.get("displayName") ?? "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMessage("Enter a valid email address.");
    if (password.length < 10) return setMessage("Use at least 10 characters for your password.");
    if (isSignup && displayName.length > 80) return setMessage("Name must be 80 characters or fewer.");

    setPending(true);
    try {
      const supabase = createClient();
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || null },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/welcome`,
          },
        });
        if (error) throw error;
        if (data.session && data.user) {
          await persistPendingVersionSnapshot(data.user.id);
          void fetch("/api/email/welcome", { method: "POST" });
          router.replace("/welcome");
          router.refresh();
          return;
        }
        setMessage("Check your email to confirm your account, then return here to sign in. Your Version Snapshot remains in this browser until you do.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await persistPendingVersionSnapshot(data.user.id);
        router.replace(redirectTo?.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard");
        router.refresh();
      }
    } catch (error) {
      setMessage(readableAuthError(error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      {isSignup && <label>Name <input name="displayName" type="text" autoComplete="name" maxLength={80} /></label>}
      <label>Email <input name="email" type="email" inputMode="email" autoComplete="email" required /></label>
      <label>Password <input name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={10} required /></label>
      {isSignup && <p className="field-help">Use at least 10 characters. Passwords are securely handled by BYNV&apos;s authentication provider and are never stored in the application.</p>}
      <button className="button" type="submit" disabled={pending}>{pending ? "Working…" : isSignup ? "Create my account" : "Sign in"}</button>
      <div className="form-message" role="status" aria-live="polite">{message}</div>
      <p className="auth-switch">
        {isSignup ? <>Already have an account? <Link href="/sign-in">Sign in</Link></> : <>New to BYNV? <Link href="/create-account">Create an account</Link></>}
      </p>
      {!isSignup && <p className="auth-switch"><Link href="/forgot-password">Forgot your password?</Link></p>}
    </form>
  );
}
