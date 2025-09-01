// /src/userName.js
import { supabase } from './supabaseClient'
import { set, setFirstName, get } from './flowState'

// Tries both user_profile (current) and profiles (legacy) tables.
// Writes to flowState AND localStorage when it finds a real first name.
// Never overwrites with "Friend".
export async function hydrateFirstNameFromSupabase() {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return null

  async function trySelect(table, idCol) {
    try {
      const { data } = await supabase
        .from(table)
        .select('first_name, full_name, display_name, name')
        .eq(idCol, user.id)
        .maybeSingle()
      return data || null
    } catch {
      return null
    }
  }

  // 1) preferred: user_profile.user_id
  let row = await trySelect('user_profile', 'user_id')

  // 2) fallback (older builds): profiles.id
  if (!row) row = await trySelect('profiles', 'id')

  const candidate =
    firstFrom(row?.first_name) ||
    firstFrom(row?.display_name) ||
    firstFrom(row?.name) ||
    firstFrom(row?.full_name)

  const first = isLikelyFirstName(candidate) ? titleCase(candidate) : null
  if (first && first !== 'Friend') {
    setFirstName(first)   // updates flowState + localStorage
    return first
  }
  return null
}

function firstFrom(s){ if(!s) return null; return String(s).trim().split(/\s+/)[0] || null }
function isLikelyFirstName(s){
  if(!s) return false
  const t = String(s).trim()
  if (t.length < 2) return false
  if (/[^A-Za-z\-'\s]/.test(t)) return false
  if (t.includes('@')) return false
  return true
}
function titleCase(s){ return String(s).toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) }
