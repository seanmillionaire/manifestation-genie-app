// src/supabaseClient.js
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";

// Automatically restores session via cookies in Next.js Pages apps
export const supabase = createPagesBrowserClient();
