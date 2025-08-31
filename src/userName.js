// /src/userName.js
import { supabase } from './supabaseClient'
import { set } from './flowState'

export async function hydrateFirstNameFromSupabase() {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return null

  const { data: row } = await supabase
    .from('profiles')
    .select('first_name, full_name, display_name')
    .eq('id', user.id)
    .maybeSingle()

  const candidates = [
    row?.first_name,
    firstFrom(row?.full_name),
    firstFrom(row?.display_name),
    user.user_metadata?.given_name,
    firstFrom(user.user_metadata?.full_name),
    firstFrom(user.user_metadata?.name),
  ].filter(Boolean)

  let first = candidates.find(isLikelyFirstName) || null
  if (!first) {
    const prefix = (user.email || '').split('@')[0]
    if (isLikelyFirstName(prefix)) first = prefix
  }

  first = titleCase(first || 'Friend')
  set({ firstName: first })
  try { localStorage.setItem('mg_first_name', first) } catch {}
  return first
}

function firstFrom(s){ return (s||'').trim().split(/\s+/)[0] || null }
function isLikelyFirstName(s){ return !!s && !/[0-9_]/.test(s) && !String(s).includes('@') && String(s).trim().length >= 2 }
function titleCase(s){ return String(s).replace(/\b\w/g, c => c.toUpperCase()) }
