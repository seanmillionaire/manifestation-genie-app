import { useState } from 'react'
import { supabase } from '../src/supabaseClient'

export default function Login() {
  const [sent, setSent] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    const email = e.target.email.value
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) { alert(error.message); return }
    setSent(true)
  }

  return (
    <div style={{maxWidth: 420, margin: '60px auto', fontFamily: 'Inter, system-ui'}}>
      <h1>Sign in to Manifestation Genie</h1>
      {sent ? (
        <p>Magic link sent. Check your email.</p>
      ) : (
        <form onSubmit={handleLogin}>
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            required
            style={{width:'100%', padding:12, marginBottom:12}}
          />
          <button type="submit" style={{padding:'10px 16px'}}>Send magic link</button>
        </form>
      )}
    </div>
  )
}
