// /pages/login.js
import { useState } from 'react'
import { supabase } from '../src/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) return
    setSending(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo:
          typeof window !== 'undefined'
            ? `${window.location.origin}/chat`
            : undefined,
      },
    })
    setSending(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="wrap">
      <header className="hero">
<div className="flex flex-col items-center mb-6">
  <img
    src="https://storage.googleapis.com/mixo-sites/images/file-3ee255ce-ebaa-41de-96f6-a1233499cf70.png"
    alt="Manifestation Genie Logo"
    className="h-12 w-auto mb-3"
  />
</div>

<p className="text-lg text-gray-300 mb-8 text-center">
  Your Personal AI Assistant for Turning Goals into Reality
</p>
      </header>

      <section className="card center">
        {!sent ? (
          <>
            <h2 className="panelTitle" style={{ marginBottom: 18 }}>Sign in</h2>
            <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 520 }}>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                className="textInput"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sending}
              />
              {error && <div className="error">{error}</div>}

              <div className="actions">
                <button type="submit" className="btn btn-primary" disabled={sending || !email.trim()}>
                  {sending ? 'Sending magic link…' : 'Send magic link'}
                </button>
              </div>
            </form>
            <p className="microNote" style={{ marginTop: 18 }}>
              We’ll email you a secure sign‑in link. No password needed.
            </p>
          </>
        ) : (
          <>
            <h2 className="panelTitle" style={{ marginBottom: 12 }}>Check your email</h2>
            <p className="sub small" style={{ maxWidth: 56 + 'ch' }}>
              We sent a magic sign‑in link to <b>{email}</b>. Open it on this device to continue.
            </p>
            <div className="actions" style={{ marginTop: 18 }}>
              <a href="/login" className="ghost">Use a different email</a>
              <a href="/chat" className="btn btn-primary">Back to app</a>
            </div>
          </>
        )}
      </section>

      <Style />
    </div>
  )
}

function Style() {
  return (
    <style jsx global>{`
      /* DO NOT touch html/body – globals.css controls background & text */
      * { box-sizing: border-box; }

      .wrap { max-width: 960px; margin: 64px auto 88px; padding: 0 24px; }

      .hero { text-align: center; margin-bottom: 40px; }
      .hero h1 { margin:0; font-size: 44px; font-weight: 900; color: var(--gold); letter-spacing:.2px; }
      .sub { margin: 10px auto 0; font-size: 18px; color: rgba(255,255,255,0.9); max-width: 68ch; line-height: 1.6; }
      .sub.small { font-size: 16px; color: rgba(255,255,255,0.7); }

      .card {
        background: rgba(255,255,255,0.04);
        color: var(--white);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius:16px;
        padding:32px 32px 28px;
        margin-bottom:28px;
        backdrop-filter: blur(6px);
      }
      .center { display:flex; flex-direction:column; align-items:center; text-align:center; }

      .panelTitle {
        margin:0;
        font-size:18px;
        font-weight:800;
        text-transform:uppercase;
        letter-spacing:.6px;
        color: var(--gold);
      }

      .label {
        display:block;
        text-align:left;
        font-size:14px;
        font-weight:700;
        margin: 0 0 8px 2px;
        color: rgba(255,255,255,0.9);
      }

      /* Inputs inherit base styles from globals.css; set layout only */
      .textInput { width:100%; }

      /* Buttons: base in globals.css; ghost variant for secondary */
      .ghost {
        background: transparent;
        color: var(--white);
        border:1px solid rgba(255,255,255,0.3);
        border-radius:12px;
        padding:12px 18px;
        font-weight:800;
        cursor:pointer;
        font-size:16px;
        text-decoration:none;
        display:inline-block;
      }
      .ghost:hover { border-color: var(--gold); color: var(--gold); }

      .actions {
        display:flex;
        gap:12px;
        justify-content:center;
        margin-top:16px;
      }

      .microNote { color: rgba(255,255,255,0.65); font-size:13px; }

      .error {
        color:#ff6b6b;
        text-align:left;
        margin-top:10px;
        font-size:14px;
      }

      @media (max-width: 560px) {
        .wrap { margin: 40px auto 64px; padding: 0 16px; }
        .hero h1 { font-size: 34px; }
        .sub { font-size: 16px; }
      }
    `}</style>
  )
}
