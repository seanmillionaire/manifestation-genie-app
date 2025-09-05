// /src/userName.js
import { supabase } from './supabaseClient';
import { set, get } from './flowState';

// basic cleaners (no TS syntax here)
function firstWord(s) {
  if (!s) return '';
  const t = String(s).trim();
  if (!t) return '';
  return t.split(/\s+/)[0];
}
function cleanFirst(s) {
  if (!s) return '';
  const t = String(s).trim();
  if (t.length < 2) return '';
  if (t.toLowerCase() === 'friend') return '';
  if (/[0-9_@]/.test(t)) return '';
  return t[0].toUpperCase() + t.slice(1);
}

function chooseBestName(candidates) {
  for (const c of candidates) {
    const f = cleanFirst(firstWord(c));
    if (f) return f;
  }
  return '';
}

export async function hydrateFirstNameFromSupabase() {
  try {
    // if we already have a decent name in state, keep it
    const curState = get() || {};
    const existing = cleanFirst(firstWord(curState.firstName));
    if (existing) {
      // also ensure localStorage is synced
      try { localStorage.setItem('mg_first_name', existing); } catch {}
      return existing;
    }

    // session + user
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      // last resort: localStorage cache
      try {
        const cached = cleanFirst(firstWord(localStorage.getItem('mg_first_name')));
        if (cached) {
          set({ firstName: cached });
          return cached;
        }
      } catch {}
      return null;
    }

    // 1) try profiles (your screenshot shows first_name & full_name here)
    let pRow = null;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, full_name, display_name, name')
        .eq('id', user.id)
        .maybeSingle();
      pRow = data || null;
    } catch {}

    // 2) try user_profile (backup location)
    let upRow = null;
    try {
      const { data } = await supabase
        .from('user_profile')
        .select('first_name, full_name')
        .eq('user_id', user.id)
        .maybeSingle();
      upRow = data || null;
    } catch {}

    // 3) user metadata (Supabase OAuth etc.)
    const meta = user.user_metadata || {};

    const chosen = chooseBestName([
      pRow?.first_name,
      pRow?.full_name,
      pRow?.display_name,
      pRow?.name,
      upRow?.first_name,
      upRow?.full_name,
      meta.full_name,
      meta.name,
      meta.preferred_username,
      user.email // ultra last-resort
    ]);

    if (chosen) {
      set({ firstName: chosen });
      try { localStorage.setItem('mg_first_name', chosen); } catch {}
      return chosen;
    }

    // still nothing: try localStorage cache
    try {
      const cached = cleanFirst(firstWord(localStorage.getItem('mg_first_name')));
      if (cached) {
        set({ firstName: cached });
        return cached;
      }
    } catch {}

    return null;
  } catch {
    // silent failure; don’t block app
    return null;
  }
}

// tiny helper for places where you just want the best available now
export function getCachedFirstName() {
  const stateName = cleanFirst(firstWord((get() || {}).firstName));
  if (stateName) return stateName;
  try {
    const ls = cleanFirst(firstWord(localStorage.getItem('mg_first_name')));
    if (ls) return ls;
  } catch {}
  return 'Friend';
}
