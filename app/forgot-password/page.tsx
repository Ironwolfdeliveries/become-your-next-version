import { PasswordReset } from "@/components/password-reset";
import { PageHero } from "@/components/ui";
export const metadata = { title: "Reset Password", description: "Request a secure BYNV password reset." };
export default function ForgotPasswordPage() { return <><PageHero eyebrow="Account recovery" title="Reset your password." copy="Enter the email associated with your BYNV account." /><div className="container auth-shell"><PasswordReset /></div></>; }
