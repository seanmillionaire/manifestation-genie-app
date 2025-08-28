// components/Questionnaire.jsx — Minimal Clean Version
import { useState, useEffect } from 'react'
import { supabase } from '../src/supabaseClient'

const todayStr = () => new Date().toISOString().slice(0,10)

export default function Questionnaire({ onDone, firstName='Friend', vibe=null }) {
  const [session, setSession] = useState(null)
  const [wish, setWish]   = useState('')
  const [block, setBlock] = useState('')
  const [micro, setMicro] = useState('')
  const [saving, setSaving] = useState(false)

  const canSubmit = wish.trim() && micro.trim()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data?.session || null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub?.subscription?.unsubscribe()
  }, [])

  async function save() {
    if (!canSubmit || saving) return
    setSaving(true)
    const userId = session?.user?.id || null
    const payload = { wish, block, micro, vibe, date: todayStr() }

    try {
      const { data, error } = await supabase
        .from('wishes')
        .insert({
          user_id: userId,
          title: payload.wish,
          summary: payload.block,
          micro: payload.micro,
          vibe: payload.vibe
        })
        .select('id,title,summary,micro,vibe,created_at')
        .single()

      if (error) throw error
      onDone?.(data)
    } catch {
      onDone?.(payload) // fallback only in memory
    }
    setSaving(false)
  }

  return (
    <div className="q">
      <h2 className="q-title">What’s today’s play, {firstName}?</h2>

      <input
        className="q-input"
        placeholder="✨ Wish"
        value={wish}
        onChange={e=>setWish(e.target.value)}
      />
      <input
        className="q-input"
        placeholder="🚧 Block"
        value={block}
        onChange={e=>setBlock(e.target.value)}
      />
      <input
        className="q-input"
        placeholder="⚡ Micro-move"
        value={micro}
        onChange={e=>setMicro(e.target.value)}
      />

      <button
        className="q-btn"
        disabled={!canSubmit || saving}
        onClick={save}
      >
        {saving ? 'Locking…' : 'Lock it in →'}
      </button>

      <style jsx>{`
        .q { padding:20px; max-width:600px; margin:0 auto; background:#fff; border:1px solid #e5e7eb; border-radius:14px; box-shadow:0 6px 20px rgba(0,0,0,.05); }
        .q-title { font-size:20px; font-weight:800; margin:0 0 12px; color:#0f172a; }
        .q-input { width:100%; margin:6px 0; padding:12px 14px; border:1px solid #e5e7eb; border-radius:10px; font-size:15px; }
        .q-btn { margin-top:12px; width:100%; padding:14px; border:2px solid #111; border-radius:12px; font-weight:900; background:#fff; box-shadow:0 6px 0 #111; }
        .q-btn:disabled { opacity:.5; cursor:not-allowed; }
        .q-btn:active { transform:translateY(2px); box-shadow:0 4px 0 #111; }
      `}</style>
    </div>
  )
}
