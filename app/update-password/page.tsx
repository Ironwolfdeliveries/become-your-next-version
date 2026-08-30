import { PasswordReset } from "@/components/password-reset";
import { PageHero } from "@/components/ui";
export const metadata = { title: "Choose New Password", description: "Choose a new secure BYNV password." };
export default function UpdatePasswordPage() { return <><PageHero eyebrow="Account recovery" title="Choose a new password." copy="Use a unique password with at least 10 characters." /><div className="container auth-shell"><PasswordReset update /></div></>; }
