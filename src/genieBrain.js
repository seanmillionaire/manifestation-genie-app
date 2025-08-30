// pages/chat-genie.js
import { useEffect, useMemo, useRef, useState } from 'react'
import Head from 'next/head'

const USE_API_FALLBACK = false; // <- keep false to guarantee local brain usage

export default function ChatGenie() {
  const [brain, setBrain] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [started, setStarted] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [inputLocked, setInputLocked] = useState(false);
  const listRef = useRef(null);

  const [count, setCount] = useState(()=>{
    if (typeof window === 'undefined') return 0
    const raw = localStorage.getItem('genie_proof_total')
    return raw ? parseInt(raw,10) || 0 : 0
  })
  useEffect(()=>{ if (typeof window!=='undefined') localStorage.setItem('genie_proof_total', String(count)) },[count])

  // load local brain on client
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const mod = await import('../src/genieBrain.js');
        if (active) setBrain(mod);
      } catch (e) {
        console.warn('genieBrain load failed', e);
        if (active) setBrain(null);
      }
    })();
    return () => { active = false; };
  }, []);

  // First name best-effort
  const firstName = useMemo(() => {
    try {
      const cached = typeof window !== 'undefined' ? localStorage.getItem('mg_first_name') : null;
      if (cached) return cached;
      return 'Friend';
    } catch { return 'Friend'; }
  }, []);

  useEffect(()=>{ listRef.current?.scrollTo(0, 1e9) }, [msgs, thinking, started])

  function pushText(author, text) { setMsgs(m => [...m, { author, text }]) }
  function pushNode(author, key, node) { setMsgs(m => [...m, { author, key, node }]) }

  // typing effect
  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)) }
  function withJitter(ms, jitter=0.35){
    const delta = ms * jitter * (Math.random()*2 - 1)
    return Math.max(0, Math.round(ms + delta))
  }
  async function typeLine(author, line, { perWordMs=120, cursor=true } = {}) {
    const key = 'stream-' + Date.now() + Math.random().toString(16).slice(2)
    setMsgs(m => [...m, { author, key, text: '' }])
    const words = String(line).split(/\s+/).filter(Boolean)
    for (let i=0; i<words.length; i++){
      await sleep(withJitter(perWordMs))
      setMsgs(curr => curr.map(msg => {
        if (msg.key !== key) return msg
        const base = (msg.text || '').replace(/▍$/, '')
        const next = base ? `${base} ${words[i]}` : words[i]
        return { ...msg, text: cursor ? `${next}▍` : next }
      }))
    }
    setMsgs(curr => curr.map(msg => (msg.key===key ? { ...msg, text: msg.text.replace(/▍$/,'') } : msg)))
    return key
  }
  async function streamBubbles(author, bubbles = [], { perWordMs=120, linePauseMs=700 } = {}) {
    for (const b of bubbles) {
      await typeLine(author, b, { perWordMs })
      await sleep(withJitter(linePauseMs))
    }
  }

  async function onLampClick() {
    if (started) return
    setStarted(true)
    setThinking(true)
    try {
      if (brain?.genieIntro) {
        const res = await brain.genieIntro({ user: { firstName } })
        const bubbles = Array.isArray(res?.bubbles) && res.bubbles.length ? res.bubbles : [
          'Ahh… the lamp warms in your palm. ✨',
          'I am the Manifestation Genie — keeper of tiny moves that bend reality.',
          'Speak your wish — a word, a sentence, a storm. I listen.'
        ]
        await streamBubbles('Genie', bubbles)
      } else {
        await streamBubbles('Genie', [
          'Ahh… the lamp warms in your palm. ✨',
          'I am the Manifestation Genie — keeper of tiny moves that bend reality.',
          'Speak your wish — a word, a sentence, a storm. I listen.'
        ])
      }
    } finally { setThinking(false) }
  }

  async function callApi(prompt) {
    const r = await fetch('/api/chat', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ prompt, user: { firstName } })
    })
    if (!r.ok) throw new Error('api')
    const data = await r.json()
    if (Array.isArray(data?.bubbles)) return data.bubbles
    if (typeof data?.text === 'string') return data.text.split('\n').filter(Boolean)
    return []
  }
  async function getReplyBubbles(prompt) {
    if (brain?.genieReply) {
      const res = await brain.genieReply({ input: prompt, user: { firstName } })
      if (Array.isArray(res?.bubbles)) return res.bubbles
      if (typeof res?.text === 'string') return res.text.split('\n').filter(Boolean)
    }
    if (!USE_API_FALLBACK) {
      return ['Local brain missing. Please refresh the page.'] // keep obvious in UI
    }
    return await callApi(prompt)
  }

  async function onSend() {
    const trimmed = input.trim()
    if (!trimmed || thinking || inputLocked) return
    pushText(firstName, trimmed)
    setInput('')
    setThinking(true)
    try {
      const bubbles = await getReplyBubbles(trimmed)
      const safe = (Array.isArray(bubbles) && bubbles.length)
        ? bubbles
        : ['As you wish — tell me the goal in one short line and I’ll give you your first 3 moves.']
      await streamBubbles('Genie', safe)
    } catch {
      pushText('Genie', 'Hmm… the lamp flickered (network/brain error). Say the wish again, or refresh.')
    } finally { setThinking(false) }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); onSend()
    }
  }

  return (
    <>
      <Head><title>Manifestation Genie</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <main style={{ background:'#fff', minHeight:'100vh', padding:'20px 0' }}>
        <div style={{ width:'min(960px, 92vw)', margin:'0 auto',
          background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:14, padding:20, position:'relative' }}>

          <div style={{ fontWeight:800, fontSize:22, display:'flex', alignItems:'center', gap:10, margin:'6px 6px 12px' }}>
            <span style={{ fontSize:24 }}>🧞‍♂️</span>
            <span>Manifestation Genie</span>
            <span style={{ marginLeft:'auto', fontSize:12, color:'#334155',
              border:'1px solid #e2e8f0', borderRadius:10, padding:'4px 8px', background:'#fff' }}>
              ✨ Wishes granted today: <b>{count.toLocaleString()}</b>
            </span>
          </div>

          {!started && (
            <div onClick={onLampClick}
                 style={{ height:'60vh', border:'1px dashed #cbd5e1', borderRadius:12, display:'flex',
                   alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, background:'#fff',
                   cursor:'pointer', userSelect:'none' }}>
              <div style={{ fontSize:72, animation:'pulse 2s infinite' }}>🧞‍♂️</div>
              <div style={{ fontSize:16, color:'#334155', textAlign:'center', padding:'0 16px' }}>
                Tap the lamp to summon your Genie. Speak your wish.
              </div>
              <style jsx>{`
                @keyframes pulse { 0%{transform:scale(1)} 50%{transform:scale(1.06)} 100%{transform:scale(1)} }
              `}</style>
            </div>
          )}

          {started && (
            <>
              <div ref={listRef}
                   style={{ height:'60vh', overflow:'auto', padding:8, background:'#fff',
                     border:'1px solid #e2e8f0', borderRadius:12, marginBottom:12 }}>
                {msgs.map((m, i) => (
                  <div key={m.key ?? i}
                       style={{ display:'flex', marginBottom:10, justifyContent: m.author === 'Genie' ? 'flex-start' : 'flex-end' }}>
                    <div style={{
                      maxWidth:'75%',
                      background: m.author === 'Genie' ? '#f1f5f9' : '#fef3c7',
                      border:'1px solid '#e2e8f0', padding:'10px 12px', borderRadius:12, whiteSpace:'pre-wrap'
                    }}>
                      {m.node ? m.node : m.text}
                    </div>
                  </div>
                ))}

                {thinking && (
                  <div style={{ display:'flex', marginBottom:10, justifyContent:'flex-start' }}>
                    <div style={{ background:'#f1f5f9', border:'1px solid #e2e8f0', padding:'10px 12px', borderRadius:12 }}>
                      <span className="dots">Genie is thinking</span>
                      <style jsx>{`
                        .dots::after { content:'…'; animation: pulse 1.2s infinite steps(4,end); }
                        @keyframes pulse { 0%{content:'.'} 33%{content:'..'} 66%{content:'...'} 100%{content:'....'} }
                      `}</style>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display:'flex', gap:8 }}>
                <textarea
                  value={input}
                  onChange={e=>setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={2}
                  placeholder={inputLocked ? "Complete today’s portal to continue…" : "Speak to your Genie… ✨"}
                  style={{ flex:1, padding:'12px 14px', borderRadius:10, border:'1px solid #cbd5e1', outline:'none' }}
                  disabled={thinking || inputLocked}
                />
                <button
                  onClick={onSend}
                  disabled={thinking || inputLocked || !input.trim()}
                  style={{ background:'#facc15', color:'#000', border:'none', borderRadius:12, padding:'10px 18px',
                    fontWeight:800, cursor: (thinking||inputLocked||!input.trim()) ? 'not-allowed' : 'pointer' }}>
                  Send
                </button>
                <button
                  onClick={()=>pushText('Genie', 'It is done — what’s today’s wish?')}
                  disabled={thinking || inputLocked}
                  style={{ background:'#fff', border:'1px solid #cbd5e1', borderRadius:12,
                    padding:'10px 14px', fontWeight:700, cursor:(thinking||inputLocked)?'not-allowed':'pointer' }}>
                  New wish
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}
