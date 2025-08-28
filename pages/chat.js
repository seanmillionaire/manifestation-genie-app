// pages/chat.js — Manifestation Genie (White Theme + Magical Flow + FULL Chat Console)
// Flow: vibe → resumeNew → wishList → questionnaire → checklist → chat
// Includes: mgHasEntered guard (no reset-to-vibe on tab refocus)

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'
import Questionnaire from '../components/Questionnaire' // uses your simplified white version

/* =========================
   Config / Language
   ========================= */
const LOGO_SRC = 'https://storage.googleapis.com/mixo-sites/images/file-3ee255ce-ebaa-41de-96f6-a1233499cf70.png'

const GenieLang = {
  greetings: [
    "The lamp glows… your Genie is here. ✨ What’s stirring in your heart today, {firstName}?",
    "Rub the lamp 🔮 — let’s spark some magic, {firstName}.",
    "The stars whispered your name, {firstName}… shall we begin?",
    "The portal is open 🌌 — step inside, {firstName}."
  ],
  vibePrompt: "What’s your vibe today, {firstName}? Choose the current you want to surf ⚡",
  resumeOrNew: "Continue your last wish — or spark a fresh one?",
  resumeLabel: "Continue last wish",
  newLabel: "Start a new wish",
  checklistTitle: "Quick Activation Checklist ✅",
}

const pick = (arr) => arr[Math.floor(Math.random()*arr.length)]
const newId = () => Math.random().toString(36).slice(2,10)

/* =========================
   Header
   ========================= */
function LogoHeader() {
  return (
    <div style={{
      width:'100%', display:'flex', alignItems:'center', justifyContent:'center',
      padding:'14px 12px', borderBottom:'1px solid #e5e7eb', background:'#fff',
      position:'sticky', top:0, zIndex:50
    }}>
      <img src={LOGO_SRC} alt="Manifestation Genie" style={{height:36, width:'auto'}} />
    </div>
  )
}

/* =========================
   Utility: ripple + backdrop
   ========================= */
function addRipple(e) {
  const btn = e.currentTarget
  const rect = btn.getBoundingClientRect()
  const ripple = document.createElement('span')
  const size = Math.max(rect.width, rect.height)
  ripple.style.position = 'absolute'
  ripple.style.left = `${e.clientX - rect.left - size/2}px`
  ripple.style.top  = `${e.clientY - rect.top  - size/2}px`
  ripple.style.width = ripple.style.height = `${size}px`
  ripple.style.borderRadius = '50%'
  ripple.style.pointerEvents = 'none'
  ripple.style.background = 'rgba(17,17,17,0.08)'
  ripple.style.transform = 'scale(0)'
  ripple.style.opacity = '1'
  ripple.style.transition = 'transform 500ms ease, opacity 600ms ease'
  btn.appendChild(ripple)
  requestAnimationFrame(() => { ripple.style.transform = 'scale(1)' })
  setTimeout(() => { ripple.style.opacity = '0'; ripple.remove() }, 600)
}

function TwinkleBackdrop() {
  return (
    <div className="mg-stars" aria-hidden="true">
      <style jsx>{`
        .mg-stars {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(1200px 800px at 50% -10%, rgba(168, 85, 247, 0.12), transparent 60%),
            radial-gradient(800px 600px at 90% 10%, rgba(234, 179, 8, 0.12), transparent 60%),
            radial-gradient(700px 500px at 10% 10%, rgba(14, 165, 233, 0.10), transparent 60%),
            #ffffff;
        }
        .mg-stars::before, .mg-stars::after {
          content:""; position:absolute; inset:0;
          background-image:
            radial-gradient(2px 2px at 20% 30%, rgba(17,17,17,0.2), transparent 40%),
            radial-gradient(2px 2px at 40% 80%, rgba(17,17,17,0.2), transparent 40%),
            radial-gradient(1.5px 1.5px at 70% 20%, rgba(17,17,17,0.15), transparent 40%),
            radial-gradient(1.5px 1.5px at 85% 60%, rgba(17,17,17,0.15), transparent 40%),
            radial-gradient(1.5px 1.5px at 15% 70%, rgba(17,17,17,0.15), transparent 40%);
          animation: twinkle 6s linear infinite;
        }
        .mg-stars::after { animation-delay:3s; opacity:.7; }
        @keyframes twinkle { 0%{opacity:.15; transform:translateY(0)} 50%{opacity:.35; transform:translateY(-6px)} 100%{opacity:.15; transform:translateY(0)} }
      `}</style>
    </div>
  )
}

/* =========================
   Vibe Select (animated)
   ========================= */
function useTypewriter(text, speed=24) {
  const [out, setOut] = useState('')
  useEffect(() => {
    let i=0; setOut('')
    const id = setInterval(()=>{ i++; setOut(text.slice(0,i)); if(i>=text.length) clearInterval(id)}, speed)
    return () => clearInterval(id)
  }, [text, speed])
  return out
}

function VibeSelect({ firstName, onSelect }) {
  const promptRaw = GenieLang.vibePrompt.replace('{firstName}', firstName || 'friend')
  const typed = useTypewriter(`🧞 ${promptRaw}`)
  const [entered, setEntered] = useState(false)
  useEffect(()=>{ window.scrollTo({top:0, behavior:'smooth'}); const t=setTimeout(()=>setEntered(true),50); return ()=>clearTimeout(t)},[])
  const Btn = ({label, onClick, klass}) => (
    <button className={`vibe-btn ${klass}`} onMouseDown={addRipple} onClick={onClick}>
      <span className="inner">{label}</span><span className="shimmer" />
      <style jsx>{`
        .vibe-btn{position:relative;border:2px solid #111;border-radius:14px;background:#fff;cursor:pointer;padding:14px 16px;min-height:64px;overflow:hidden;transition:transform .12s,box-shadow .2s;box-shadow:0 6px 0 #111}
        .vibe-btn:active{transform:translateY(2px);box-shadow:0 4px 0 #111}
        .inner{font-size:17px;font-weight:900;color:#111}
        .shimmer{pointer-events:none;position:absolute;inset:0;background:linear-gradient(110deg,transparent 0%,transparent 40%,rgba(17,17,17,.06) 50%,transparent 60%,transparent 100%);transform:translateX(-120%);animation:sweep 3.5s ease-in-out infinite}
        @keyframes sweep{0%{transform:translateX(-120%)}60%{transform:translateX(120%)}100%{transform:translateX(120%)}}
        .vibe-btn:hover{box-shadow:0 10px 24px rgba(99,102,241,0.18),0 6px 0 #111}
      `}</style>
    </button>
  )
  return (
    <div className="vibe-wrap">
      <TwinkleBackdrop/>
      <div className={`vibe-card ${entered?'entered':''}`}>
        <div className="aura"/>
        <div className="prompt">{typed}</div>
        <div className="buttons">
          <Btn label="🔥 Bold"  klass="bold" onClick={()=>onSelect('bold')}/>
          <Btn label="🙏 Calm"  klass="calm" onClick={()=>onSelect('calm')}/>
          <Btn label="💰 Rich"  klass="rich" onClick={()=>onSelect('rich')}/>
        </div>
      </div>
      <style jsx>{`
        .vibe-wrap{position:relative;min-height:calc(100vh - 60px);display:flex;align-items:center;justify-content:center;padding:24px;background:#fff}
        .vibe-card{position:relative;z-index:1;width:100%;max-width:720px;padding:26px 24px;border:1px solid #e5e7eb;border-radius:18px;background:#fff;box-shadow:0 12px 40px rgba(167,139,250,.25);opacity:0;transform:translateY(12px) scale(.96);transition:opacity .5s, transform .6s cubic-bezier(.16,.84,.44,1);overflow:hidden}
        .vibe-card.entered{opacity:1;transform:translateY(0) scale(1)}
        .aura{position:absolute;inset:-20%;background:radial-gradient(350px 220px at 20% 10%,rgba(168,85,247,.16),transparent 60%),radial-gradient(300px 200px at 80% 0%,rgba(234,179,8,.16),transparent 60%);filter:blur(20px);animation:aura 6s ease-in-out infinite}
        @keyframes aura{0%,100%{opacity:.65;transform:scale(1)}50%{opacity:.85;transform:scale(1.03)}}
        .prompt{position:relative;z-index:1;font-size:20px;line-height:1.35;font-weight:900;color:#0f172a;margin:2px 4px 16px}
        .buttons{position:relative;z-index:1;display:grid;grid-template-columns:1fr;gap:12px}
        @media(min-width:680px){.buttons{grid-template-columns:repeat(3,1fr)}}
      `}</style>
    </div>
  )
}

/* =========================
   Resume/New + WishList + Checklist
   ========================= */
function ResumeOrNew({ onPick }) {
  return (
    <div className="ron-wrap">
      <TwinkleBackdrop/>
      <div className="ron-card">
        <div className="title">🧞 {GenieLang.resumeOrNew}</div>
        <div className="actions">
          <button className="ron-btn" onMouseDown={addRipple} onClick={()=>onPick('resume')}>{GenieLang.resumeLabel}</button>
          <button className="ron-btn" onMouseDown={addRipple} onClick={()=>onPick('new')}>{GenieLang.newLabel}</button>
        </div>
      </div>
      <style jsx>{`
        .ron-wrap{position:relative;min-height:calc(100vh - 60px);display:flex;align-items:center;justify-content:center;padding:24px;background:#fff}
        .ron-card{position:relative;z-index:1;width:100%;max-width:680px;padding:22px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 12px 40px rgba(99,102,241,.18)}
        .title{font-weight:900;color:#0f172a;font-size:20px;margin-bottom:14px}
        .actions{display:grid;gap:12px;grid-template-columns:1fr}
        @media(min-width:600px){.actions{grid-template-columns:1fr 1fr}}
        .ron-btn{position:relative;padding:14px 16px;min-height:64px;cursor:pointer;border:2px solid #111;border-radius:12px;background:#fff;font-weight:900;box-shadow:0 6px 0 #111;transition:transform .12s,box-shadow .2s}
        .ron-btn:active{transform:translateY(2px);box-shadow:0 4px 0 #111}
      `}</style>
    </div>
  )
}

function WishList({ userId, onSelectWish, onBack }) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load(){
      setLoading(true); setErr(null)
      try {
        let { data: wishes, error: wErr } = await supabase
          .from('wishes')
          .select('id,title,summary,micro,created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending:false })
          .limit(50)
        if (wErr) throw wErr
        if ((!wishes || wishes.length===0)) {
          const { data: entries, error: eErr } = await supabase
            .from('daily_entries')
            .select('id,intention,focus_area,created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending:false })
            .limit(50)
          if (eErr) throw eErr
          wishes = (entries||[]).map(e=>({ id:e.id, title:e.intention, summary:e.focus_area, created_at:e.created_at }))
        }
        if (!cancelled) setItems(wishes||[])
      } catch(e){ if(!cancelled) setErr(e.message||'Load failed') }
      finally{ if(!cancelled) setLoading(false) }
    }
    if (userId) load()
    return ()=>{ cancelled=true }
  }, [userId])

  return (
    <div className="wish-wrap">
      <TwinkleBackdrop/>
      <div className="wish-card">
        <div className="hdr">
          <button className="back" onClick={onBack}>← Back</button>
          <div className="title">📜 Your saved wishes</div>
        </div>
        {loading && <div className="state">Summoning your scrolls… ✨</div>}
        {err && <div className="state error">Couldn’t fetch: {err}</div>}
        {!loading && !err && items.length===0 && <div className="state">No previous wishes yet.</div>}
        <ul className="list">
          {items.map(w=>(
            <li key={w.id} className="row" onClick={()=>onSelectWish(w)}>
              <div className="left">
                <div className="t">{w.title || 'Untitled wish'}</div>
                {w.summary ? <div className="s">{w.summary}</div> : null}
              </div>
              <div className="right">
                <div className="meta">{new Date(w.created_at).toLocaleDateString()}</div>
                <div className="cta">Resume →</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <style jsx>{`
        .wish-wrap{position:relative;min-height:calc(100vh - 60px);display:flex;align-items:center;justify-content:center;padding:24px;background:#fff}
        .wish-card{position:relative;z-index:1;width:100%;max-width:860px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 12px 40px rgba(168,85,247,.18);padding:16px}
        .hdr{display:flex;align-items:center;gap:12px;margin-bottom:8px}
        .back{appearance:none;border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:8px 10px;cursor:pointer}
        .title{font-weight:900;color:#0f172a;font-size:20px}
        .state{padding:16px;color:#475569}.state.error{color:#b91c1c}
        .list{list-style:none;padding:0;margin:6px 0 0}
        .row{display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid #e5e7eb;border-radius:12px;padding:12px;cursor:pointer;background:#fff;transition:box-shadow .15s, transform .12s}
        .row+.row{margin-top:10px}
        .row:hover{box-shadow:0 10px 24px rgba(99,102,241,.18);transform:translateY(-1px)}
        .t{font-weight:800;color:#0f172a}.s{color:#475569;font-size:13.5px;margin-top:2px}
        .right{display:flex;align-items:center;gap:10px}.meta{color:#64748b;font-size:12.5px}.cta{font-weight:900}
      `}</style>
    </div>
  )
}

function Checklist({ onDone }) {
  const [checks, setChecks] = useState([false,false,false])
  const all = checks.every(Boolean)
  return (
    <div className="chk-wrap">
      <TwinkleBackdrop/>
      <div className="chk-card">
        <div className="title">🪄 {GenieLang.checklistTitle}</div>
        <ul>
          <li onClick={()=>setChecks(([a,b,c])=>[!a,b,c])}>{checks[0]?'✅':'⬜️'} Set a clear intention</li>
          <li onClick={()=>setChecks(([a,b,c])=>[a,!b,c])}>{checks[1]?'✅':'⬜️'} Choose one micro-action for today</li>
          <li onClick={()=>setChecks(([a,b,c])=>[a,b,!c])}>{checks[2]?'✅':'⬜️'} Promise your future self one tiny step</li>
        </ul>
        <button className="primary" disabled={!all} onMouseDown={addRipple} onClick={onDone}>Enter the Chamber →</button>
      </div>
      <style jsx>{`
        .chk-wrap{position:relative;min-height:calc(100vh - 60px);display:flex;align-items:center;justify-content:center;padding:24px;background:#fff}
        .chk-card{position:relative;z-index:1;width:100%;max-width:680px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 12px 40px rgba(168,85,247,.18);padding:22px}
        .title{font-weight:900;color:#0f172a;font-size:20px;margin-bottom:10px}
        ul{list-style:none;padding:0;margin:8px 0 16px}
        li{padding:10px 12px;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:8px;font-weight:700;color:#0f172a;cursor:pointer;background:#fff}
        .primary{width:100%;padding:14px 16px;border:2px solid #111;border-radius:12px;font-weight:900;background:#fff;box-shadow:0 6px 0 #111;cursor:pointer;min-height:58px}
        .primary:disabled{opacity:.5;cursor:not-allowed}
        .primary:active:not(:disabled){transform:translateY(2px);box-shadow:0 4px 0 #111}
      `}</style>
    </div>
  )
}

/* =========================
   FULL Messenger-style Chat Console
   ========================= */
function ChatConsole({ firstName }) {
  const [thread, setThread] = useState(() => ([
    { id:newId(), role:'assistant', author:'Genie', content:`${pick(GenieLang.greetings).replace('{firstName}', firstName || 'friend')}`, likedByUser:false, likedByGenie:false }
  ]))
  const [input, setInput] = useState('')
  const endRef = useRef(null)
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}) }, [thread])

  function onToggleLike(id, who){
    setThread(prev => prev.map(m => m.id===id ? (who==='user' ? {...m, likedByUser:!m.likedByUser} : {...m, likedByGenie:!m.likedByGenie}) : m))
  }

  function maybeGenieLikes(msg){
    const t = (msg.content||'').toLowerCase()
    const isWin = /(done|shipped|posted|sold|launched|emailed|completed|locked in)/.test(t)
    if (isWin || Math.random() < 0.25) {
      setThread(prev => prev.map(m => m.id===msg.id ? {...m, likedByGenie:true} : m))
    }
  }

  async function onSend(){
    const text = input.trim()
    if (!text) return
    const userMsg = { id:newId(), role:'user', author:firstName||'You', content:text, likedByUser:false, likedByGenie:false }
    setThread(prev=>prev.concat(userMsg))
    setInput('')
    maybeGenieLikes(userMsg)

    // ——— call your API
    try{
      const resp = await fetch('/api/chat',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ messages:[...thread.map(({role,content})=>({role,content})), {role:'user', content:text}] }) })
      const data = await resp.json()
      const aiText = data?.reply || "The lamp hums. Tell me more."
      setThread(prev=>prev.concat({ id:newId(), role:'assistant', author:'Genie', content:aiText, likedByUser:false, likedByGenie:false }))
    }catch{
      setThread(prev=>prev.concat({ id:newId(), role:'assistant', author:'Genie', content:"The lamp flickered. Try again.", likedByUser:false, likedByGenie:false }))
    }
  }

  return (
    <div className="chat-wrap">
      <div className="chat-stream">
        {thread.map(m=>{
          const isAI = m.role==='assistant'
          return (
            <div key={m.id} className={isAI?'row ai':'row user'}>
              <div className="avatar">{isAI?'🔮':'🙂'}</div>
              <div className="col">
                <div className={isAI?'name ai':'name user'}>{isAI?'Genie':(m.author||firstName||'You')}</div>
                <div className={isAI?'bubble ai':'bubble user'}>
                  <div className="text">{m.content}</div>
                </div>
                <div className="react">
                  {isAI ? (
                    <button className={m.likedByUser?'like active':'like'} onClick={()=>onToggleLike(m.id,'user')}>
                      👍 {m.likedByUser?'Liked':'Like'}
                    </button>
                  ) : (
                    m.likedByGenie ? <span className="badge">Genie liked this 👍</span> : null
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef}/>
      </div>

      <div className="composer">
        <input
          className="input"
          value={input}
          onChange={e=>setInput(e.target.value)}
          placeholder="Speak to your Genie… 🔮"
          onKeyDown={(e)=>{ if(e.key==='Enter') onSend() }}
        />
        <button className="send" onClick={onSend}>Send</button>
      </div>

      <style jsx>{`
        .chat-wrap{padding:16px;max-width:980px;margin:0 auto}
        .chat-stream{border:1px solid #e5e7eb;border-radius:16px;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.06);padding:16px;min-height:420px;max-height:560px;overflow:auto}
        .row{display:flex;gap:10px;align-items:flex-start;margin:10px 0}
        .row.user{flex-direction:row-reverse}
        .avatar{width:32px;height:32px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:18px}
        .name{font-size:12px;opacity:.7;margin:0 0 4px 4px}
        .name.user{margin:0 4px 4px 0;text-align:right}
        .bubble{max-width:85%;padding:12px 14px;border-radius:12px;margin:8px 0}
        .bubble.ai{background:#f8fafc;border:1px solid #e5e7eb}
        .bubble.user{background:rgba(255,214,0,.08);border:1px solid rgba(255,214,0,.25);margin-left:auto}
        .text{white-space:pre-wrap;word-break:break-word}
        .react{display:flex;gap:8px;align-items:center;margin:6px 6px 0 6px}
        .like{border:1px solid #e5e7eb;background:#fff;border-radius:999px;padding:2px 8px;font-size:12px;cursor:pointer}
        .like.active{border-color:rgba(255,214,0,.6);background:rgba(255,214,0,.12);color:#7a5a00}
        .badge{font-size:12px;color:#7a5a00;background:rgba(255,214,0,.12);border:1px solid rgba(255,214,0,.35);border-radius:999px;padding:2px 8px}
        .composer{display:flex;gap:10px;align-items:center;margin-top:10px}
        .input{flex:1;padding:12px 14px;border-radius:12px;border:1px solid #e5e7eb;background:#fff;outline:none}
        .send{padding:12px 16px;border-radius:12px;border:2px solid #111;background:#fff;font-weight:900;box-shadow:0 6px 0 #111;cursor:pointer}
        .send:active{transform:translateY(2px);box-shadow:0 4px 0 #111}
      `}</style>
    </div>
  )
}

/* =========================
   Main Page
   ========================= */
export default function ChatPage() {
  const [session, setSession]   = useState(null)
  const [firstName, setFirstName] = useState('friend')
  const [flow, setFlow] = useState('vibe') // vibe → resumeNew → wishList → questionnaire → checklist → chat
  const [vibe, setVibe] = useState(null)
  const [activeWish, setActiveWish] = useState(null)

  // Load session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data?.session || null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub?.subscription?.unsubscribe()
  }, [])

  // Pull first name + guard so we don't keep resetting to vibe on refocus
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (!session?.user?.id) return
        const { data: p } = await supabase.from('profiles').select('first_name').eq('id', session.user.id).single()
        const fn = p?.first_name?.split(' ')?.[0] || (session.user.email||'friend').split('@')[0]
        if (alive) setFirstName(fn)
      } catch {}
    })()
    return () => { alive=false }
  }, [session])

  useEffect(() => {
    if (session && !localStorage.getItem('mgHasEntered')) {
      setFlow('vibe')
      localStorage.setItem('mgHasEntered','true')
    }
  }, [session])

  function handleVibeSelect(v) {
    setVibe(v); localStorage.setItem('mgVibe', v); setFlow('resumeNew')
  }
  function handleResumeNew(choice) {
    if (choice==='resume') setFlow('wishList'); else setFlow('questionnaire')
  }
  function handleSelectWish(w) {
    setActiveWish(w); localStorage.setItem('mgActiveWish', JSON.stringify(w)); setFlow('checklist')
  }
  function handleQuestionnaireDone(newWish) {
    if (newWish) { setActiveWish(newWish); localStorage.setItem('mgActiveWish', JSON.stringify(newWish)) }
    setFlow('checklist')
  }
  function handleChecklistDone() {
    if (!activeWish) {
      const ls = localStorage.getItem('mgActiveWish'); if (ls) setActiveWish(JSON.parse(ls))
    }
    setFlow('chat')
  }

  const userId = session?.user?.id || null

  return (
    <div className="page">
      <LogoHeader/>
      {flow==='vibe' && <VibeSelect firstName={firstName} onSelect={handleVibeSelect}/>}
      {flow==='resumeNew' && <ResumeOrNew onPick={handleResumeNew}/>}
      {flow==='wishList' && <WishList userId={userId} onSelectWish={handleSelectWish} onBack={()=>setFlow('resumeNew')}/>}
      {flow==='questionnaire' && (
        <div style={{padding:'18px'}}>
          <div style={{maxWidth:980, margin:'0 auto', border:'1px solid #e5e7eb', borderRadius:16, background:'#fff', boxShadow:'0 10px 30px rgba(0,0,0,.06)'}}>
            <Questionnaire onDone={handleQuestionnaireDone} firstName={firstName} vibe={vibe}/>
          </div>
        </div>
      )}
      {flow==='checklist' && <Checklist onDone={handleChecklistDone}/>}
      {flow==='chat' && <ChatConsole firstName={firstName}/>}

      <style jsx global>{`
        html, body, #__next { background:#ffffff; }
        * { box-sizing: border-box; }
        .page { min-height:100vh; background:#fff; }
        ::selection { background:#fde68a; }
      `}</style>
    </div>
  )
}
