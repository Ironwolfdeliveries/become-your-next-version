import { Resend } from "resend";
import { BYNV_CONTACT_EMAIL } from "@/lib/contact";
import { createAdminClient } from "@/lib/supabase/admin";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.becomeyournextversion.com";

function shell(preview: string, heading: string, body: string, action?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;background:#0b0b0b;color:#f1eadc;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${preview}</div><div style="max-width:620px;margin:auto;padding:44px 24px"><div style="color:#c6a15b;letter-spacing:.18em;font-size:12px;font-weight:700">BYNV · BECOME YOUR NEXT VERSION</div><h1 style="font-family:Georgia,serif;font-size:42px;line-height:1.05;font-weight:500;margin:28px 0 18px">${heading}</h1><div style="color:#cfc7ba;font-size:16px;line-height:1.7">${body}</div>${action ? `<p style="margin-top:30px"><a href="${action.href}" style="display:inline-block;background:#c6a15b;color:#0b0b0b;padding:14px 20px;text-decoration:none;font-weight:700;letter-spacing:.05em">${action.label}</a></p>` : ""}<p style="border-top:1px solid #39342c;margin-top:42px;padding-top:22px;color:#817a70;font-size:12px">Build deliberately. Review honestly. Become your next version.</p></div></body></html>`;
}

export async function sendWelcomeEmail(user: { id: string; email?: string; user_metadata?: { display_name?: string } }) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !user.email || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { sent: false, reason: "not-configured" as const };
  const admin = createAdminClient();
  const { data: prior } = await admin.from("email_events").select("id").eq("user_id", user.id).eq("kind", "welcome").in("status", ["sent", "delivered"]).maybeSingle();
  if (prior) return { sent: false, reason: "already-sent" as const };
  const name = user.user_metadata?.display_name?.trim() || "Architect";
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: user.email,
    replyTo: BYNV_CONTACT_EMAIL,
    subject: "Welcome to BYNV, Architect",
    html: shell("Your BYNV account is ready.", `Welcome, ${name}.`, `<p>Your secure BYNV account is ready. Your Version Snapshot is the opening signal; the deeper Architect Assessment builds the baseline for your Blueprint, Dashboard, Daily Focus, and progress.</p><p>Start with honest answers, not ideal answers. Your result is a point of orientation—not a label.</p>`, { label: "BEGIN MY ARCHITECT ASSESSMENT", href: `${siteUrl}/architect-assessment` }),
  });
  await admin.from("email_events").insert({ user_id: user.id, kind: "welcome", provider_id: data?.id ?? null, status: error ? "failed" : "sent" });
  if (error) throw error;
  return { sent: true as const };
}

export async function sendBillingIssueEmail(userId: string, sourceEventId: string) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { sent: false, reason: "not-configured" as const };
  const admin = createAdminClient();
  const { data: prior } = await admin.from("email_events").select("id").eq("source_event_id", sourceEventId).maybeSingle();
  if (prior) return { sent: false, reason: "already-sent" as const };
  const { data: { user } } = await admin.auth.admin.getUserById(userId);
  if (!user?.email) return { sent: false, reason: "missing-email" as const };
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({ from: process.env.EMAIL_FROM, to: user.email, replyTo: BYNV_CONTACT_EMAIL, subject: "Your BYNV membership payment needs attention", html: shell("Update your BYNV billing details.", "Your membership payment needs attention.", "<p>BYNV could not confirm the latest membership payment. Your private data remains in your account, but paid access may be limited until the payment method is updated.</p><p>Open secure billing management to review the payment method, invoice, plan, or cancellation options.</p>", { label: "MANAGE BILLING", href: `${siteUrl}/membership` }) }, { headers: { "Idempotency-Key": `bynv-billing-${sourceEventId}` } });
  await admin.from("email_events").insert({ user_id: userId, kind: "billing", source_event_id: sourceEventId, provider_id: data?.id ?? null, status: error ? "failed" : "sent" });
  if (error) throw error;
  return { sent: true as const };
}
