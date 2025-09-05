// /src/userName.js
import { supabase } from './supabaseClient';
import { get, set } from './flowState';

// -------- utils --------
function firstWord(s) {
  if (!s) return '';
  const t = String(s).trim();
  if (!t) return '';
  return t.split(/\s+/)[0] || '';
}
function cleanFirst(s) {
  const t = (s || '').trim();
  if (!t || t.length < 2) return '';
  if (t.toLowerCase() === 'friend') return '';
  if (/[0-9_@]/.test(t)) return '';
  return t[0].toUpperCase() + t.slice(1);
}
function pickBestName(obj = {}) {
  const candidates = [
    obj.first_name,
    obj.full_name,
    obj.display_name,
    obj.name,
    obj.fullName,
    obj.displayName,
  ];
  for (const c of candidates) {
    const first = cleanFirst(firstWord(c));
    if (first) return first;
  }
  return '';
}

// -------- sources --------
function fromState() {
  try {
    const s = get();
    const first = cleanFirst(s?.firstName);
    return first || '';
  } catch { return ''; }
}
function fromLocalStorage() {
  try {
    if (typeof window === 'undefined') return '';
    const ls = (localStorage.getItem('mg_first_name') || '').trim();
    return cleanFirst(ls);
  } catch { return ''; }
}

async function fromSupabase() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return '';

    // 1) profiles
    const { data: p } = await supabase
      .from('profiles')
      .select('first_name, full_name, display_name, name')
      .eq('id', user.id)
      .maybeSingle();

    // 2) user_profile (fallback)
    const { data: up } = await supabase
      .from('user_profile')
      .select('first_name, full_name, display_name, name')
      .eq('user_id', user.id)
      .maybeSingle();

    const best = pickBestName({
      first_name: p?.first_name ?? up?.first_name,
      full_name:  p?.full_name  ?? up?.full_name,
      display_name: p?.display_name ?? up?.display_name,
      name: p?.name ?? up?.name,
      fullName: user.user_metadata?.full_name,
      displayName: user.user_metadata?.name,
    });

    return best || '';
  } catch { return ''; }
}

// -------- public API --------
export async function ensureFirstName() {
  // 1) state
  let name = fromState();
  if (name) return name;

  // 2) localStorage
  name = fromLocalStorage();
  if (name) {
    set({ firstName: name });
    return name;
  }

  // 3) Supabase
  name = await fromSupabase();
  if (name) {
    set({ firstName: name });
    try { localStorage.setItem('mg_first_name', name); } catch {}
    return name;
  }

  // Nothing found
  return '';
}
