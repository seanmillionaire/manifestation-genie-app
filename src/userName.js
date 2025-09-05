// /src/userName.js
import { supabase } from './supabaseClient'
import { set } from './flowState'

export async function hydrateFirstNameFromSupabase() {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return null

  // Read from profiles
  const { data: row } = await supabase
    .from('profiles')
    .select('first_name, full_name, display_name, name')
    .eq('id', user.id)
    .maybeSingle()

  const candidate =
    firstWord(row?.first_name) ||
    firstWord(row?.full_name) ||
    firstWord(row?.display_name) ||
    firstWord(row?.name)

  const first = cleanFirst(candidate)
  if (first) {
    set({ firstName: first })
    try { localStorage.setItem('mg_first_name', first) } catch {}
    return first
  }
  return null
}

function firstWord(s) { return s ? String(s).trim().split(/\s+/)[0] : null }
function cleanFirst(s) {
  if (!s) return null
  const t = String(s).trim()
  if (t.length < 2) return null
  if (t.toLowerCase() === 'friend') return null
  if (/[0-9_@]/.test(t)) return null
  return t[0].toUpperCase() + t.slice(1)
}
