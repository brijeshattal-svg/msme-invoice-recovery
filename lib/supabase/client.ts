import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Optional accounts (saved invoice lists). Without both variables the app runs exactly as before:
// no client, no sign-in, nothing stored. The anon (publishable) key is meant for the browser; what
// it can reach is limited by row-level security (supabase/migrations). Never put the service-role
// key in a NEXT_PUBLIC_ variable.
// Next inlines NEXT_PUBLIC_ values at build time only when they are written out literally.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when this build has a Supabase project to save to. */
export function accountsEnabled(url = SUPABASE_URL, key = SUPABASE_KEY): boolean {
  return Boolean(url?.startsWith("https://") && key && key.length > 20);
}

let client: SupabaseClient | null | undefined;

/** The browser's Supabase client, or null when accounts are not set up (or on the server). */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (typeof window === "undefined" || !accountsEnabled()) return null;
  client = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
  });
  return client;
}
