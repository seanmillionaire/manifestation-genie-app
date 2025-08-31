// src/userName.js
import { supabase } from './supabaseClient';
import { setFirstName } from './flowState';

export async function hydrateFirstNameFromSupabase() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  // Try profiles.full_name, then user metadata, then email prefix.
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const raw =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    (user.email ? user.email.split('@')[0] : '') ||
    'Friend';

  const first = raw.trim().split(/\s+/)[0] || 'Friend';
  setFirstName(first); // writes to flowState + localStorage (mg_first_name)
  return first;
}
