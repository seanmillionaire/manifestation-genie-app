// /src/userName.js
import { supabase } from './supabaseClient'
import { set } from './flowState'

// Tries multiple places: profiles.full_name/name/first_name/last_name, user_metadata, then email prefix
async function hydrateFirstNameFromSupabase() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const u = session?.user
    if (!u) return null

    const { data: row } = await supabase
      .from('profiles')
      .select('full_name, name, first_name, last_name')
      .eq('id', u.id)
      .maybeSingle()

    const raw =
      row?.full_name ||
      row?.name ||
      [row?.first_name, row?.last_name].filter(Boolean).join(' ') ||
      u.user_metadata?.full_name ||
      u.user_metadata?.name ||
      (u.email ? u.email.split('@')[0] : '') ||
      'Friend'

    const first = (raw || '').trim().split(/\s+/)[0] || 'Friend'

    // Persist into app state + localStorage (read by pages instantly)
    set({ firstName: first })
    try { localStorage.setItem('mg_first_name', first) } catch {}

    return first
  } catch {
    return null
  }
}

export { hydrateFirstNameFromSupabase }
export default hydrateFirstNameFromSupabase
