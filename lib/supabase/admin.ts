import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./config";

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase server administration is not configured.");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
