// /src/userName.js
import { supabase } from './supabaseClient'
import { set } from './flowState'

export async function hydrateFirstNameFromSupabase() {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return null

  // 1) Try to read the profile row
  let row = null
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, full_name, display_name')
      .eq('id', user.id)
      .maybeSingle()
    if (!error) row = data || null
  } catch {}

  // 2) If no row, create one (RLS policy required—see below)
  if (!row) {
    const guessFull = buildFullNameFromUser(user) // from auth metadata if available
    const { data } = await supabase
      .from('profiles')
      .insert({ id: user.id, full_name: guessFull || null })
      .select('id, first_name, full_name, display_name')
      .maybeSingle()
    row = data || null
  }

  // 3) Choose a real first name (ignore handles/usernames)
  const first = pickFirstName(row, user)

  // 4) Save for instant reads across pages
  set({ firstName: first })
  try { localStorage.setItem('mg_first_name', first) } catch {}

  return first
}

/* ---------- helpers ---------- */
function buildFullNameFromUser(user) {
  const m = user?.user_metadata || {}
  return (
    m.full_name ||
    [m.given_name, m.family_name].filter(Boolean).join(' ') ||
    m.name ||
    null
  )
}

export function pickFirstName(row, user) {
  const m = user?.user_metadata || {}
  const candidates = [
    row?.first_name,
    firstFrom(row?.full_name),
    firstFrom(row?.display_name),
    m.given_name,
    firstFrom(m.full_name),
    firstFrom(m.name),
  ].filter(Boolean)

  let first = candidates.find(isLikelyFirstName) || null

  // LAST resort: email prefix only if it looks like a name
  if (!first) {
    const prefix = (user?.email || '').split('@')[0]
    if (isLikelyFirstName(prefix)) first = prefix
  }
  return titleCase(first || 'Friend')
}

function firstFrom(s) {
  if (!s || typeof s !== 'string') return null
  return s.trim().split(/\s+/)[0]
}
function isLikelyFirstName(s) {
  if (!s) return false
  const t = String(s).trim()
  if (t.length < 2) return false
  if (/[0-9_]/.test(t)) return false   // reject blitzbeats7, anna_01
  if (t.includes('@')) return false    // reject emails
  return true
}
function titleCase(s) { return s.replace(/\b\w/g, c => c.toUpperCase()) }
