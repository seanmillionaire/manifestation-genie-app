// /src/userName.js
import { supabase } from "./supabaseClient";
import { set } from "./flowState";

/**
 * Hydrates firstName into flowState (and localStorage) from Supabase.
 * Safe to call during client render; will no-op if no session.
 * Returns the resolved first name string or null.
 */
export async function hydrateFirstNameFromSupabase() {
  try {
    // 1) Session / user
    const { data: { session } = {} } = await supabase.auth.getSession();
    const user = session && session.user ? session.user : null;
    if (!user) return null;

    // 2) profiles
    let first =
      (await getFirstFromTable("profiles", user.id)) ||
      (await getFirstFromTable("user_profile", user.id)) || // fallback
      cleanFirst(
        firstWord(
          (user.user_metadata && (
            user.user_metadata.full_name ||
            user.user_metadata.name ||
            user.user_metadata.display_name
          )) || ""
        )
      );

    // 3) Persist to app state + localStorage (client only)
    if (first) {
      set({ firstName: first });
      if (typeof window !== "undefined") {
        try { localStorage.setItem("mg_first_name", first); } catch {}
      }
      return first;
    }

    return null;
  } catch {
    return null;
  }
}

/* ----------------------------- helpers ----------------------------- */

async function getFirstFromTable(table, userId) {
  try {
    const { data: row } = await supabase
      .from(table)
      .select("first_name, full_name, display_name, name")
      .eq("id", userId)
      .maybeSingle();

    if (!row) return null;

    const candidate =
      firstWord(row.first_name) ||
      firstWord(row.full_name) ||
      firstWord(row.display_name) ||
      firstWord(row.name);

    return cleanFirst(candidate);
  } catch {
    return null;
  }
}

function firstWord(s) {
  if (!s) return null;
  const t = String(s).trim();
  if (!t) return null;
  return t.split(/\s+/)[0];
}

function cleanFirst(s) {
  if (!s) return null;
  const t = String(s).trim();
  if (t.length < 2) return null;
  if (/^friend$/i.test(t)) return null;
  if (/[0-9_@]/.test(t)) return null;
  return t[0].toUpperCase() + t.slice(1);
}
