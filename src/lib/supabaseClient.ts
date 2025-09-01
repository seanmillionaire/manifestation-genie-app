// /src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowser() {
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          // unique key so it doesn't fight with any other apps/tabs
          storageKey: "mg-auth-v1",
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );
  }
  return browserClient;
}
