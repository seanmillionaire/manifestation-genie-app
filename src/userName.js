// /src/userName.js
import { supabase } from "./supabaseClient";
import { set, get } from "./flowState";

// helpers
function firstWord(s) { return s ? String(s).trim().split(/\s+/)[0] : ""; }
function cleanFirst(s) {
  const t = firstWord(s);
  if (!t) return "";
  if (t.length < 2) return "";
  if (/^(friend)$/i.test(t)) return "";
  if (/[0-9_@]/.test(t)) return "";
  return t[0].toUpperCase() + t.slice(1);
}

/**
 * Hydrates firstName into flowState from Supabase.
 * Order of truth:
 *   1) profiles.first_name / full_name / display_name / name
 *   2) auth.user().user_metadata.name  (one-time backfill into profiles)
 * NEVER writes to localStorage. Supabase is the source of truth.
 */
export async function hydrateFirstNameFromSupabase() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return null;

    // 1) Read from profiles
    const { data: row, error } = await supabase
      .from("profiles")
      .select("first_name, full_name, display_name, name")
      .eq("id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      // (PGRST116 = no rows) — ignore that
      console.warn("profiles fetch error:", error);
    }

    const fromProfiles =
      cleanFirst(row?.first_name) ||
      cleanFirst(row?.full_name) ||
      cleanFirst(row?.display_name) ||
      cleanFirst(row?.name);

    if (fromProfiles) {
      set({ firstName: fromProfiles });
      return fromProfiles;
    }

    // 2) Fallback: auth user_metadata.name (one-time backfill)
    const metaFirst = cleanFirst(user.user_metadata?.name);
    if (metaFirst) {
      // backfill into profiles so all devices get it next time
      await supabase
        .from("profiles")
        .upsert(
          { id: user.id, first_name: metaFirst, updated_at: new Date().toISOString() },
          { onConflict: "id" }
        );

      set({ firstName: metaFirst });
      return metaFirst;
    }

    // 3) Nothing found -> keep Friend (but do NOT store it)
    set({ firstName: "Friend" });
    return null;
  } catch (e) {
    console.warn("hydrateFirstNameFromSupabase failed:", e);
    return null;
  }
}

/**
 * Ensure flowState has a firstName. If missing, hydrate from Supabase.
 * Returns the best current name (or "Friend" if unavailable).
 */
export async function ensureFirstName() {
  const cur = get();
  const existing = (cur.firstName || "").trim();
  if (existing && !/^friend$/i.test(existing)) return existing;

  const hydrated = await hydrateFirstNameFromSupabase();
  return hydrated || "Friend";
}
