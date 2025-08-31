// /src/userName.js
import { supabase } from './supabaseClient'
import { set } from './flowState'

export async function hydrateFirstNameFromSupabase() {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return null

  // Pull everything we might need from your profile row
  const { data: row } = await supabase
    .from('profiles')
    .select('first_name, full_name, display_name')
    .eq('id', user.id)
    .maybeSingle()

  // Candidate list (best → worst)
  const candidates = [
    row?.first_name,
    user.user_metadata?.given_name,
    firstFrom(row?.full_name),
    firstFrom(user.user_metadata?.full_name),
    firstFrom(user.user_metadata?.name),
    firstFrom(row?.display_name),
  ].filter(Boolean)

  // Pick the first thing that looks like a real first name (not a handle)
  let first = candidates.find(isLikelyFirstName) || null

  // LAST resort: email prefix only if it looks like a name
  if (!first) {
    const prefix = (user.email || '').split('@')[0]
    if (isLikelyFirstName(prefix)) first = prefix
  }

  // Fallback
  first = titleCase(first || 'Friend')

  // Save to flowState + localStorage for fast reads everywhere
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
  const t = s.trim()
  if (t.length < 2) return false
  if (/[0-9_]/.test(t)) return false  // reject handles like blitzbeats7 or anna_01
  if (t.includes('@')) return false   // reject emails
  return true
}
function titleCase(s) {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}
