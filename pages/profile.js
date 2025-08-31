// /pages/profile.js
import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../src/supabaseClient'
import { get, set } from '../src/flowState' // optional: sync firstName

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)
  const [refreshedAt, setRefreshedAt] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        setSession(maskSession(session))
        const u = session?.user || null
        setUser(u)
        if (!u) {
          setLoading(false)
          return
        }

        // Fetch ALL columns from profiles for this user (adjust table name/PK if needed)
        const { data: row, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', u.id)
          .maybeSingle()

        if (pErr) {
          // RLS or missing row will land here
          setError(pErr.message || 'Failed to load profile row')
        } else {
          setProfile(row || null)
        }

        // Optional: keep local firstName in sync with Supabase profile (used elsewhere in UI)
        const first = pickFirstName(u, row)
        if (first) set({ firstName: first })

        setRefreshedAt(new Date().toISOString())
      } catch (e) {
        setError(e?.message || String(e))
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const compiled = useMemo(() => {
    return {
      // High-level view
      summary: {
        id: user?.id || null,
        email: user?.email || null,
        phone: user?.phone || null,
        name_guess: pickFirstName(user, profile) || null,
        created_at: user?.created_at || null,
        last_sign_in_at: user?.last_sign_in_at || null,
        refreshed_at: refreshedAt,
      },
      // Full raw objects
      auth_user: user || null,
      session: session || null,
      profile_row: profile || null,
    }
  }, [user, profile, session, refreshedAt])

  async function refreshAll() {
    setLoading(true)
    setError(null)
    try {
      // Force a token refresh, then rerun initial logic
      await supabase.auth.refreshSession()
      const { data: { session } } = await supabase.auth.getSession()
      setSession(maskSession(session))
      const u = session?.user || null
      setUser(u)

      if (u) {
        const { data: row, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', u.id)
          .maybeSingle()
        if (pErr) setError(pErr.message)
        setProfile(row || null)
        const first = pickFirstName(u, row)
        if (first) set({ firstName: first })
      } else {
        setProfile(null)
      }
      setRefreshedAt(new Date().toISOString())
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(compiled, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'supabase-user-profile.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!loading && !user) {
    return (
      <main style={{ width:'min(900px, 94vw)', margin:'30px auto' }}>
        <h1 style={{ fontSize:28, fontWeight:900, margin:'0 0 12px' }}>Profile</h1>
        <div style={cardStyle}>
          <p>You’re not signed in.</p>
          <Link href="/"><a style={linkStyle}>Go to Sign In</a></Link>
        </div>
      </main>
    )
  }

  return (
    <>
      <Head><title>Profile</title></Head>
      <main style={{ width:'min(1100px, 94vw)', margin:'30px auto' }}>
        <header style={{ display:'flex', alignItems:'center', gap:16, marginBottom:14 }}>
          <Avatar user={user} profile={profile} />
          <div>
            <h1 style={{ fontSize:28, fontWeight:900, margin:'0 0 4px' }}>
              {pickFirstName(user, profile) || 'Friend'}
            </h1>
            <div style={{ color:'var(--muted)' }}>{user?.email || user?.phone || '—'}</div>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:10 }}>
            <button onClick={refreshAll} disabled={loading} style={btnStyle}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button onClick={downloadJSON} style={btnStyleOutline}>Download JSON</button>
          </div>
        </header>

        {error && (
          <div style={{ ...cardStyle, border:'1px solid #ef4444', background:'#fef2f2', color:'#991b1b' }}>
            <strong>Error:</strong> {error}
            <div style={{ fontSize:12, opacity:.8, marginTop:6 }}>
              If this is a profiles RLS issue, ensure a SELECT policy like:
              <code> (id = auth.uid()) </code>
            </div>
          </div>
        )}

        <section style={gridStyle}>
          <div style={cardStyle}>
            <h2 style={h2Style}>Summary</h2>
            <KVList obj={compiled.summary} />
          </div>

          <div style={cardStyle}>
            <h2 style={h2Style}>Auth User (from Supabase Auth)</h2
