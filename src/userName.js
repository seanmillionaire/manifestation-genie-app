// /src/userName.js
import { supabase } from './supabaseClient'
import { set } from './flowState'

export async function hydrateFirstNameFromSupabase() {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return null

  // Read profile
  let row = null
  try {
    const { data } = await supabase
      .from('profiles')
      .select('first_name, full_name, display_name')
      .eq('id', user.id)
      .maybeSingle()
    row = data || null
  } catch {}

  // Pick a real first name (ignore handles)
  const first = pickFirstName(row, user) || 'Friend'

  // Update app state
  set({ firstName: first })

  // Only cache if it’s a real name (never persist "Friend")
  try {
    if (first && first !== 'Friend') localStorage.setItem('mg_first_name', first)
  } catch {}

  return first
}

export function pickFirstName(row, user) {
  const m = user?.user_metadata || {}
  const cands = [
    row?.first_name,
    firstFrom(row?.full_name),
    firstFrom(row?.display_name),
    m.given_name,
    firstFrom(m.full_name),
    firstFrom(m.name),
  ].filter(Boolean)

  let first = cands.find(isLikelyFirstName) || null
  if (!first) {
    const prefix = (user?.email || '').split('@')[0]
    if (isLikelyFirstName(prefix)) first = prefix
  }
  return first ? titleCase(first) : null
}

function firstFrom(s){ if(!s) return null; return String(s).trim().split(/\s+/)[0] || null }
function isLikelyFirstName(s){
  if(!s) return false
  const t = String(s).trim()
  if (t.length < 2) return false
  if (/[0-9_]/.test(t)) return false
  if (t.includes('@')) return false
  return true
}
function titleCase(s){ return String(s).replace(/\b\w/g, c => c.toUpperCase()) }
