import { useEffect, useState } from 'react'
import { supabase } from '../src/supabaseClient'

export default function Chat() {
  const [session, setSession] = useState(null)
  const [allowed, setAllowed] = useState(null) // null=checking, true/false=result

  // get auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // check allowlist by email
  useEffect(() => {
    async function run() {
      if (!session?.user?.email) return
      const { data, error } = await supabase
        .from('allowlist')
        .select('status')
        .eq('email', session.user.email)
        .maybeSingle()
      if (error) {
        console.error(error)
        setAllowed(false)
      } else {
        setAllowed(data?.status === 'active')
      }
    }
    run()
  }, [session])

  if (!session) return <div style={{padding:20}}><p>Not logged in.</p><a href="/login">Go to Login</a></div>
  if (allowed === null) return <div style={{padding:20}}>Checking access…</div>
  if (!allowed) {
    return (
      <div style={{padding:20}}>
        <h2>Access inactive</h2>
        <p>Your email isn’t active for Manifestation Genie.</p>
        <a href="YOUR_PAYHIP_PRODUCT_URL">Get Access</a>
      </div>
    )
  }

  return (
    <div style={{maxWidth:800, margin:'40px auto', fontFamily:'Inter, system-ui'}}>
      <h1>Manifestation Genie</h1>
      <p>Welcome, {session.user.email}</p>

      {/* === Embed your chatbot widget below this line === */}
      <div style={{border:'1px solid #ddd', padding:16, borderRadius:8}}>
        <p>🔮 Your chat will appear here.</p>
        {/* Example: <script src="https://your-bot-provider/embed.js"></script> */}
        {/* Example container: <div id="mg-bot" data-user={session.user.email}></div> */}
      </div>

      <button style={{marginTop:16}} onClick={() => supabase.auth.signOut()}>Logout</button>
    </div>
  )
}
