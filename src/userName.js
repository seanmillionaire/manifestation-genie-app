// /src/userName.ts
import { set, get } from "./flowState";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";

function firstFromString(s?: string | null) {
  if (!s) return "";
  const t = String(s).trim();
  if (!t) return "";
  return t.split(/\s+/)[0];
}

function pickFirstName(opts: {
  profiles_first?: string | null;
  profiles_full?: string | null;
  user_first?: string | null;   // from user_profile
  user_full?: string | null;    // from user_profile
  meta_name?: string | null;    // supabase auth user_metadata.name
  email?: string | null;
  ls?: string | null;           // localStorage mg_first_name
}) {
  const candidates = [
    firstFromString(opts.ls),
    firstFromString(opts.profiles_first),
    firstFromString(opts.user_first),
    firstFromString(opts.profiles_full),
    firstFromString(opts.user_full),
    firstFromString(opts.meta_name),
  ].filter(Boolean);

  // last-ditch: derive from email local-part
  if (!candidates.length && opts.email) {
    const local = opts.email.split("@")[0] || "";
    if (local && !/[0-9_@]/.test(local)) candidates.push(local);
  }

  const best = (candidates[0] || "").trim();
  if (!best || best.toLowerCase() === "friend") return "";
  return best[0].toUpperCase() + best.slice(1);
}

export async function hydrateFirstNameFromSupabase() {
  try {
    // 0) If we already have a good name in state, mirror it to LS and bail.
    const stateName = (get()?.firstName || "").trim();
    if (stateName && stateName !== "Friend") {
      try { localStorage.setItem("mg_first_name", stateName); } catch {}
      return stateName;
    }

    // 1) Try localStorage first (fast path)
    let lsName = "";
    try {
      lsName = (localStorage.getItem("mg_first_name") || "").trim();
      if (lsName && lsName !== "Friend") {
        set({ firstName: lsName });
        return lsName;
      }
    } catch {}

    // 2) Pull from Supabase
    const supabase = createPagesBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    let profiles_first = null, profiles_full = null, user_first = null, user_full = null, meta_name = null, email = null;

    if (user) {
      email = user.email || null;
      meta_name = (user.user_metadata?.name || user.user_metadata?.full_name || null) as string | null;

      // profiles table
      const { data: p } = await supabase
        .from("profiles")
        .select("first_name, full_name")
        .eq("id", user.id)
        .maybeSingle();

      profiles_first = (p?.first_name ?? null) as string | null;
      profiles_full  = (p?.full_name  ?? null) as string | null;

      // user_profile table
      const { data: up } = await supabase
        .from("user_profile")
        .select("first_name, full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      user_first = (up?.first_name ?? null) as string | null;
      user_full  = (up?.full_name  ?? null) as string | null;
    }

    // 3) Choose best & persist everywhere
    const best = pickFirstName({ profiles_first, profiles_full, user_first, user_full, meta_name, email, ls: lsName });

    if (best) {
      set({ firstName: best });
      try { localStorage.setItem("mg_first_name", best); } catch {}
      return best;
    }

    // 4) Fallback
    set({ firstName: "Friend" });
    return "Friend";
  } catch {
    // Safe fallback
    set({ firstName: "Friend" });
    return "Friend";
  }
}
