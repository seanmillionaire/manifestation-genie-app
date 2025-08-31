// /src/userName.js
import { supabase } from './supabaseClient'
import { set } from './flowState'

export async function hydrateFirstNameFromSupabase() {
  // 1) get the signed-in user
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return null

  // 2) try the profiles table (best source of truth)
  let profile = null
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('first_name, full_name, display_name')
      .eq('id', user.id)
      .maybeSingle()
    if (!error) profile = data
  } catch (e) {
    // If RLS blocks reads, we’ll fall back to metadata.
    console.warn('[userName] profiles read failed:', e?.message || e)
  }

  // 3) collect candidates, best → worst
  const candidates = [
    profile?.first_name,
    firstFrom(profile?.full_name),
    firstFrom(profile?.display_name),

    user.user_metadata?.given_name,
    firstFrom(user.user_metadata?.full_name),
    firstFrom(user.user_metadata?.name),
  ].filter(Boolean)

  // 4) pick something that looks like a real first name (not a handle)
  let first = candidates.find(isLikelyFirstName) || null

  // 5) last resort: email prefix *only* if it looks like a name
  if (!first) {
    const prefix = (user.email || '').split('@')[0]
    if (isLikelyFirstName(prefix)) first = prefix
  }

  // 6) fallback + polish
  first = titleCase(first || 'Friend')

  // 7) save to app state + localStorage (fast reads everywhere)
  set({ firstName: first })
  try { localStorage.setItem('mg_first_name', first) } catch {}

  return first
}

// helpers
function firstFrom(s) {
  if (!s || typeof s !== 'string') return null
  return s.trim().split(/\s+/)[0]
}
function isLikelyFirstName(s) {
  if (!s) return false
  const t = String(s).trim()
  if (t.length < 2) return false
  if (/[0-9_]/.test(t)) return false      // reject blitzbeats7, anna_01
  if (t.includes('@')) return false       // reject emails
  return true
}
function titleCase(s) {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}
