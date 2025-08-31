// /src/useFirstName.js
import { useEffect, useState } from 'react'
import { get } from './flowState'

export default function useFirstName() {
  // read from flowState/localStorage first (instant), hydrate next
  const initial =
    typeof window === 'undefined'
      ? 'Friend'
      : (get().firstName || localStorage.getItem('mg_first_name') || 'Friend')

  const [firstName, setFirstName] = useState(initial)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // if we don’t have a real name yet, hydrate from Supabase
        const cur = get().firstName
        if (!cur || cur === 'Friend') {
          const m = await import('./userName') // uses supabase, client-only
          await m.hydrateFirstNameFromSupabase()
        }
        if (alive) {
          const next = get().firstName || localStorage.getItem('mg_first_name') || 'Friend'
          setFirstName(next)
        }
      } catch {}
    })()

    // keep in sync if another tab updates localStorage
    const onStorage = (e) => {
      if (e.key === 'mg_first_name') setFirstName(e.newValue || 'Friend')
    }
    if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
    return () => {
      alive = false
      if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
    }
  }, [])

  return firstName
}
