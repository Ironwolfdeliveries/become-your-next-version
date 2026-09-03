import { redirect } from "next/navigation";
import { createClient } from "./server";

export async function requireUser(next: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return user;
}
