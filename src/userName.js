// /src/userName.js
import { supabase } from './supabaseClient';
import { set, get } from './flowState';

// ----- tiny helpers (plain JS; no TS syntax) -----
function firstWord(s) {
  if (!s) return null;
  const t = String(s).trim();
  if (!t) return null;
  return t.split(/\s+/)[0] || null;
}
function cleanFirst(s) {
  if (!s) return null;
  const t = String(s).trim();
  if (t.length < 2) return null;
  if (t.toLowerCase() === 'friend') return null;
  if (/[0-9_@]/.test(t)) return null;
  return t[0].toUpperCase() + t.slice(1);
}
function fromEmailPrefix(email) {
  try {
    if (!email || typeof email !== 'string') return null;
    const prefix = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
    return cleanFirst(firstWord(prefix));
  } catch { return null; }
}
function setEverywhere(first) {
  if (!first) return;
  const cur = get() || {};
  set({ ...cur, firstName: first });
  try { if (typeof window !== 'undefined') localStorage.setItem('mg_first_name', first); } catch {}
}

// Exported: quick resolver that prefers cached/local values
export function resolveFirstNameCached() {
  // 1) flowState
  const st = get() || {};
  if (st.firstName && st.firstName !== 'Friend') return st.firstName;

  // 2) localStorage
  if (typeof window !== 'undefined') {
    try {
      const ls = (localStorage.getItem('mg_first_name') || '').trim();
      const c = cleanFirst(firstWord(ls));
      if (c) return c;
    } catch {}
  }
  return null;
}

// Exported: main hydrator that fetches from Supabase if needed
export async function hydrateFirstNameFromSupabase() {
  // If we already have a valid cached name, set it in state and exit
  const cached = resolveFirstNameCached();
  if (cached) { setEverywhere(cached); return cached; }

  // Pull session
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  // Try profiles table
  let row = null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('first_name, full_name, display_name, name')
      .eq('id', user.id)
      .maybeSingle();
    row = data || null;
  } catch {}

  // Try user_profile (if you use it)
  let row2 = null;
  try {
    const { data } = await supabase
      .from('user_profile')
      .select('first_name, full_name, display_name, name')
      .eq('user_id', user.id)
      .maybeSingle();
    row2 = data || null;
  } catch {}

  // user_metadata and email fallbacks
  const meta = user?.user_metadata || {};
  const metaName =
    firstWord(meta.name) ||
    firstWord(meta.full_name) ||
    firstWord(meta.given_name) ||
    null;

  const emailGuess = fromEmailPrefix(user.email);

  // Build candidate list, pick the first clean one
  const candidates = [
    firstWord(row?.first_name),
    firstWord(row?.full_name),
    firstWord(row?.display_name),
    firstWord(row?.name),

    firstWord(row2?.first_name),
    firstWord(row2?.full_name),
    firstWord(row2?.display_name),
    firstWord(row2?.name),

    metaName,
    emailGuess
  ].filter(Boolean);

  let picked = null;
  for (const c of candidates) {
    const cleaned = cleanFirst(c);
    if (cleaned) { picked = cleaned; break; }
  }

  if (picked) {
    setEverywhere(picked);
    return picked;
  }

  // Nothing good found
  return null;
}
