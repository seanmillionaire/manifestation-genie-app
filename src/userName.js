// /src/userName.js
import { supabase } from "./supabaseClient";
import { set, get } from "./flowState";

/**
 * Pull a "first name" from Supabase/auth only (no localStorage).
 * Priority:
 * 1) profiles.first_name
 * 2) user_profile.first_name
 * 3) profiles.full_name / user_profile.full_name
 * 4) auth user_metadata.name / full_name
 */
export async function hydrateFirstNameFromSupabase() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return null;

    const [{ data: p }, { data: up }] = await Promise.all([
      supabase.from("profiles")
        .select("first_name, full_name")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("user_profile")
        .select("first_name, full_name")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const candidates = [
      p?.first_name,
      up?.first_name,
      p?.full_name,
      up?.full_name,
      user.user_metadata?.name,
      user.user_metadata?.full_name,
    ];

    const first = pickCleanFirst(candidates);
    if (first) {
      set({ ...get(), firstName: first });
      return first;
    }
    return null;
  } catch {
    return null;
  }
}

function pickCleanFirst(list) {
  for (const v of list || []) {
    const f = firstWord(v);
    const c = cleanFirst(f);
    if (c) return c;
  }
  return null;
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
  if (t.toLowerCase() === "friend") return null;
  if (/[0-9_@]/.test(t)) return null;
  return t[0].toUpperCase() + t.slice(1);
}
