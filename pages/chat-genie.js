// /pages/chat-genie.js
import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import { get, set as setFlow } from '../src/flowState'
import { supabase } from '../src/supabaseClient'

function getFirstNameCached() {
  if (typeof window === 'undefined') return get().firstName || 'Friend'
  return get().firstName || localStorage.getItem('mg_first_name') || 'Friend'
}

function looksLikeHandle(x){ return /[0-9_]/.test(x || '') || (x || '').includes('@') }

async function directHydrateFirstName() {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return null

  // Try profiles first
  let row = null
  try {
    const { data } = await supabase
      .from('profiles')
      .select('first_name, full_name, display_name')
      .eq('id', user.id)
      .maybeSingle()
    row = data || null
  } catch {}

  const m = user.user_metadata || {}
  const cands = [
    row?.first_name,
    firstFrom(row?.full_name),
    firstFrom(row?.display_name),
    m.given_name,
    firstFrom(m.full_name),
    firstFrom(m.name),
  ].filter(Boolean)

  let first = cands.find(isName) || null
  if (!first) {
    const prefix = (user.email || '').split('@')[0]
    if (isName(prefix)) first = prefix
  }
  first = first ? titleCase(first) : 'Friend'

  // Write to flow state
  setFlow({ firstName: first })
  // Only cache real names
  try { if (first !== 'Friend') localStorage.setItem('mg_first_name', first) } catch {}

  return first
}

function firstFrom(s){ if(!s) return null; return String(s).trim().split(/\s+/)[0] || null }
function isName(s){
  if(!s) return false
  const t = String(s).trim()
  if (t.length < 2) return false
  if (/[0-9_]/.test(t)) return false
  if (t.includes('@')) return false
  return true
}
function titleCase(s){ return String(s).replace(/\b\w/g, c => c.toUpperCase()) }

export default function ChatGenie() {
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [name, setName] = useState(getFirstNameCached())
  const listRef = useRef(null)

  useEffect(() => { listRef.current?.scrollTo(0, 1e9) }, [msgs, thinking])

  // Hydrate: helper → fallback direct → update UI; never persist "Friend"
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // Run the shared helper first
        const mod = await import('../src/userName') // named export
        await mod.hydrateFirstNameFromSupabase()
      } catch {}

      let current = getFirstNameCached()
      if (!current || current === 'Friend' || looksLikeHandle(current)) {
        // Old-build style direct hydration fallback
        await directHydrateFirstName()
        current = getFirstNameCached()
      }
      if (alive) setName(current || 'Friend')
    })()

    const onStorage = e => { if (e.key === 'mg_first_name') setName(e.newValue || 'Friend') }
    if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
    return () => {
      alive = false
      if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
    }
  }, [])

  function key() { return Math.random().toString(36).slice(2) }
  function push(author, text) { setMsgs(m => [...m, { author, text, key: key() }]) }

  async function callApi(text) {
    const S = get()
    const realName = getFirstNameCached()
    const r = await fetch('/api/chat', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        userName: realName || null,
        user: { firstName: realName || null, name: realName || null },
        context: {
          wish: S.currentWish?.wish || null,
          block: S.currentWish?.block || null,
          micro: S.currentWish?.micro || null,
          vibe: S.vibe || null
        },
        messages: msgs.map(m => ({
          role: m.author === 'Genie' ? 'assistant' : 'user',
          content: m.text
        })).concat({ role:'user', content: text })
      })
    })
    const data = await r.json()
    if (Array.isArray(data?.bubbles) && data.bubbles[0]) return data.bubbles
    if (typeof data?.text === 'string') return [data.text]
    return ['As you wish. What’s the specific outcome you want?']
  }

  async function send() {
    const text = (input || '').trim()
    if (!text || thinking) return
    push(name || 'You', text)
    setInput('')
    setThinking(true)
    try {
      const bubbles = await callApi(text)
      for (const b of bubbles) push('Genie', b)
    } catch {
      push('Genie', 'The lamp flickered. Try again.')
    } finally {
      setThinking(false)
      listRef.current?.scrollTo(0, 1e9)
    }
  }

  return (
    <>
      <Head><title>Genie Chat</title></Head>
      <main style={{ width:'min(900px, 94vw)', margin:'30px auto' }}>
        <h1 style={{ fontSize:28, fontWeight:900, margin:'0 0 12px' }}>
          Genie Chat, {name || 'Friend'}
        </h1>

        <div ref={listRef} style={{
          minHeight:360, maxHeight:520, overflowY:'auto',
          border:'1px solid rgba(0,0,0,0.08)', borderRadius:12, padding:12, background:'#fafafa'
        }}>
          {msgs.map(m => (
            <div key={m.key} style={{ display:'flex', gap:8, margin:'8px 0', flexDirection: m.author === 'Genie' ? 'row' : 'row-reverse' }}>
              <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(0,0,0,0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                {m.author === 'Genie' ? '🔮' : '🙂'}
              </div>
              <div style={{maxWidth:'80%'}}>
                <div style={{ fontSize:12, opacity:.65, margin: m.author === 'Genie' ? '0 0 4px 6px' : '0 6px 4px 0', textAlign: m.author === 'Genie' ? 'left' : 'right' }}>
                  {m.author === 'Genie' ? 'Genie' : (name || 'You')}
                </div>
                <div style={{
                  background: m.author === 'Genie' ? 'rgba(0,0,0,0.04)' : 'rgba(255,214,0,0.15)',
                  border:'1px solid rgba(0,0,0,0.08)', borderRadius:12, padding:'10px 12px'
                }}>
                  {m.text}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{display:'flex', gap:10, marginTop:10}}>
          <textarea
            rows={2}
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={`Speak to your Genie, ${name || 'Friend'}…`}
            style={{flex:1, padding:'12px 14px', borderRadius:12, border:'1px solid rgba(0,0,0,0.15)'}}
          />
          <button
            onClick={send}
            disabled={thinking || !input.trim()}
            style={{
              background:'#facc15', border:'1px solid #eab308',
              borderRadius:10, padding:'10px 16px', fontWeight:700,
              cursor:(thinking || !input.trim()) ? 'not-allowed' : 'pointer'
            }}
          >
            Send
          </button>
        </div>
      </main>
    </>
  )
}
