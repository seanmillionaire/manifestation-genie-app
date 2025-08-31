// /src/userName.js
import { supabase } from './supabaseClient'
import { set, NAME_KEY } from './flowState'

export async function hydrateFirstNameFromSupabase() {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return null

  // Prefer profiles.full_name, then user metadata, then email prefix
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const raw =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    (user.email ? user.email.split('@')[0] : '') ||
    'Friend'

  const first = (raw || 'Friend').trim().split(/\s+/)[0] || 'Friend'

  // Write into flowState (persists via its save()) and mirror a plain key for quick reads
  set({ firstName: first })
  try { localStorage.setItem(NAME_KEY, first) } catch {}

  return first
}
