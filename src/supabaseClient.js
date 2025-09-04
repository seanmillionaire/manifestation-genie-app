// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

/**
 * Single, shared Supabase client.
 * - In the browser, we stash it on globalThis to avoid re-creating during HMR / new page loads.
 * - On the server, we use a simple module-scoped singleton.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  // Fails fast but won't crash SSR — you'll just see a clear console error.
  // eslint-disable-next-line no-console
  console.error('Supabase env not set: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

let serverClient = null;

function makeClient() {
  return createClient(supabaseUrl, supabaseAnon, {
    auth: {
      // unique key to avoid clobbering other apps using the same domain/storage
      storageKey: 'mg-auth',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    global: { headers: { 'x-mg-app': 'manifestation-genie' } }
  });
}

export const supabase = (() => {
  if (typeof window === 'undefined') {
    // Server side — keep one per process
    if (!serverClient) serverClient = makeClient();
    return serverClient;
  }
  // Browser — keep a single instance on globalThis
  if (!globalThis.__MG_SUPABASE__) {
    globalThis.__MG_SUPABASE__ = makeClient();
  }
  return globalThis.__MG_SUPABASE__;
})();
