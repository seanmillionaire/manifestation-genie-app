import { useEffect, useState } from 'react'
import { supabase } from '../src/supabaseClient'

export default function Chat() {
  const [session, setSession] = useState(null)
  const [allowed, setAllowed] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function run() {
      if (!session) return
      const email = session.user.email
      const { data, error } = await supabase
        .from('allowlist')
        .select('status')
        .eq('email', email)
        .maybeSingle()
      if (error) { console.error(error); setAllowed(false); return }
      setAllowed(data?.status === 'active')
    }
    run()
  }, [session])

  if (!session) return <p>Not logged in. <a href="/login">Login</a></p>
  if (allowed === null) return <p>Checking access…</p>
  if (!allowed) return <p>Access inactive. <a href="YOUR_PAYHIP_URL">Get access</a></p>

  return (
    <div>
      <h1>Manifestation Genie</h1>
      {/* embed your chatbot here */}
    </div>
  )
}
