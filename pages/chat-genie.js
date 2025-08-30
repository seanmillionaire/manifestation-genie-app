// pages/chat-genie.js
// Manifestation Genie — chat with lamp intro + in-chat DAILY PORTAL (bubbles)
// Flow inside chat: Identity (if missing) → Shockcard → Ritual Seal → Exercise → Proof → Lock until 5:00 AM

import { useEffect, useMemo, useRef, useState } from 'react'
import Head from 'next/head'

/* =========================================================
   Optional local brain; safe fallback to /api/chat if absent
   ========================================================= */
let localBrain = null
try {
  const brain = require('../src/genieBrain')
  localBrain = {
    genieIntro: brain.genieIntro,
    genieReply: brain.genieReply,
    dailyAssignment: brain.dailyAssignment
  }
} catch (_) {}

/* =========================================================
   Optional Supabase (only to guess first name)
   ========================================================= */
let supabase = null
try {
  supabase = require('../src/supabaseClient').supabase
} catch (_) {}

/* =========================================================
   Helpers: user first name
   ========================================================= */
function useFirstName() {
  const [firstName, setFirstName] = useState('Friend')
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const cached = typeof window !== 'undefined' ? localStorage.getItem('mg_first_name') : null
        if (cached && mounted) { setFirstName(cached); return }
        if (supabase) {
          const { data:{ session } = { session: null } } = await supabase.auth.getSession()
          const email = session?.user?.email || ''
          const guess = email ? (email.split('@')[0] || '') : ''
          const name = guess ? guess.replace(/[._-]+/g,' ').trim().split(' ')[0] : 'Friend'
          if (mounted) setFirstName(name.charAt(0).toUpperCase() + name.slice(1))
        }
      } catch {}
    })()
    return () => { mounted = false }
  }, [])
  useEffect(() => {
    if (typeof window === 'undefined') return
    try { localStorage.setItem('mg_first_name', firstName) } catch {}
  }, [firstName])
  return firstName || 'Friend'
}

/* =========================================================
   DAILY PORTAL engine (O,P,N,Ph,C) — embedded as chat bubbles
   ========================================================= */
const UI = {
  ink: '#0f172a', sub: '#475569', muted: '#64748b', line: '#e2e8f0',
  brand: '#6633cc', gold: '#f59e0b', wash: '#ffffff', glow: 'rgba(167,139,250,.25)', radius: 12
}
const DAILY_UNLOCK_HOUR = 5 // local time

function todayKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth()+1).padStart(2,'0')
  const dd = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${dd}`
}
function nextUnlockDate() {
  const now = new Date()
  const unlock = new Date(now.getFullYear(), now.getMonth(), now.getDate(), DAILY_UNLOCK_HOUR, 0, 0, 0)
  if (now >= unlock) unlock.setDate(unlock.getDate()+1)
  return unlock
}
function timeUntilUnlockStr() {
  const n = new Date(), u = nextUnlockDate()
  const ms = u - n, h = Math.floor(ms/3_600_000), m = Math.floor((ms%3_600_000)/60_000)
  return `${h}h ${m}m`
}
function useProofCounter(seed=12000) {
  const [count, setCount] = useState(() => {
    if (typeof window === 'undefined') return seed
    const saved = localStorage.getItem('genie_proof_total')
    if (saved) return parseInt(saved,10)
    const v = seed + Math.floor(Math.random()*200)
    localStorage.setItem('genie_proof_total', String(v))
    return v
  })
  const bump = (n=1)=> setCount(c=>{
    const v = c+n
    if (typeof window !== 'undefined') localStorage.setItem('genie_proof_total', String(v))
    return v
  })
  return {count,bump}
}

const SHOCKCARDS = [
  { id:'1111', title:'11:11 — Alignment Portal', mantra:'I am precisely on time.' },
  { id:'777',  title:'777 — Fortunate Flow',     mantra:'I am the probability of prosperity.' },
  { id:'888',  title:'888 — Infinite Yield',     mantra:'Money multiplies while I breathe.' }
]

const ROTATION = ['O','P','N','Ph','C']

const EXERCISES = [
  // --- Ontology
  { id:'O-1', cat:'O', title:'Identity Switch (90s)',
    steps:["Say out loud: “I am the one money trusts.”","Stand tall; inhale 4, exhale 6 (x3).","Send ONE message that could bring money today."],
    check:"What changed in your posture/energy (1 word)?"
  },
  { id:'O-2', cat:'O', title:'Future-Normal (2m)',
    steps:["Imagine your goal is normal — again today.","Pick ONE habit Future-You does automatically.","Do it now."],
    check:"Name the habit + rate certainty 1–10."
  },
  { id:'O-3', cat:'O', title:'Boundary Install (2m)',
    steps:["Whisper: “My energy is premium.”","Decline one drain today."],
    check:"What did you say no to?"
  },
  { id:'O-4', cat:'O', title:'Value Broadcast (3m)',
    steps:["Write a 1-sentence promise you deliver.","Post/send it once."],
    check:"Paste the sentence."
  },
  { id:'O-5', cat:'O', title:'Decision Lock (2m)',
    steps:["Pick one lingering decision.","Decide now. No second pass."],
    check:"What did you decide?"
  },
  { id:'O-6', cat:'O', title:'Identity Proof (3m)',
    steps:["List 3 receipts (times you created money).","Read them out loud."],
    check:"Which receipt hit hardest?"
  },
  // --- Psychology
  { id:'P-1', cat:'P', title:'Pattern Interrupt (60s)',
    steps:["When worry spikes: say 'Stop. Not mine.'","Breath 4/6 once.","Tap wrist 7x: “I am safe to receive.”"],
    check:"Intensity drop % (0–100)?"
  },
  { id:'P-2', cat:'P', title:'Inner Prosecutor → Defender (3m)',
    steps:["Write the harsh thought verbatim.","Now write a 2-line defense brief."],
    check:"Post the 2-line defense."
  },
  { id:'P-3', cat:'P', title:'Money Shame Rinse (3m)',
    steps:["Name earliest money embarrassment (label only).","Whisper: 'I forgive the copy. I keep the lesson.'"],
    check:"One lesson you keep?"
  },
  { id:'P-4', cat:'P', title:'Fear to Task (2m)',
    steps:["Write the fear in 5 words.","Translate into ONE tiny action today."],
    check:"Fear → Action?"
  },
  { id:'P-5', cat:'P', title:'Overwhelm Box (2m)',
    steps:["Dump every 'should' for 60s.","Circle ONE needle-mover."],
    check:"What did you circle?"
  },
  { id:'P-6', cat:'P', title:'Comparison Kill (90s)',
    steps:["Mute/hide 3 scarcity-trigger accounts."],
    check:"Body now (1 word)?"
  },
  // --- Neuropsychology
  { id:'N-1', cat:'N', title:'7-Breath Reset (90s)',
    steps:["Inhale 4 / hold 4 / exhale 6 — 7 rounds.","On each exhale: “Money flows when I breathe.”"],
    check:"Calm level now (1–10)?"
  },
  { id:'N-2', cat:'N', title:'Wrist Anchor (60s)',
    steps:["Press fingers to left wrist pulse.","Repeat 7x: “It arrives today.”"],
    check:"What sensation at the pulse?"
  },
  { id:'N-3', cat:'N', title:'Visual Micro-Loop (2m)',
    steps:["Eyes closed: see today’s notification.","Loop the scene 7 times quickly."],
    check:"One word for the feeling?"
  },
  { id:'N-4', cat:'N', title:'Task Pairing (3m)',
    steps:["Pair your most resisted task with a favorite song.","Start both; stop when the song ends."],
    check:"Did you start? What got done?"
  },
  { id:'N-5', cat:'N', title:'Micro-Rep Goal (2m)',
    steps:["Pick a 2-min money action. Do it now."],
    check:"What micro-rep did you complete?"
  },
  { id:'N-6', cat:'N', title:'Sleep Primer (tonight, 1m)',
    steps:["3 slow breaths; whisper: 'My brain consolidates wins.'","See tomorrow’s ping once."],
    check:"Did you wake with an idea? What?"
  },
  // --- Phenomenology
  { id:'Ph-1', cat:'Ph', title:'Somatic Yes (2m)',
    steps:["Recall a real win; find the body-spot that lights up.","Rub that spot and say: 'Do it again.'"],
    check:"Where in your body turned on?"
  },
  { id:'Ph-2', cat:'Ph', title:'Scene Swap (3m)',
    steps:["Take today’s dread scene.","Swap soundtrack + lighting to playful."],
    check:"Mood after swap (1 word)?"
  },
  { id:'Ph-3', cat:'Ph', title:'Five-Sense Deposit (3m)',
    steps:["Describe in 1 line each how your goal smells, tastes, looks, sounds, feels."],
    check:"Paste your 5 lines."
  },
  { id:'Ph-4', cat:'Ph', title:'Gratitude Needle (2m)',
    steps:["Find gratitude for ONE tiny business detail."],
    check:"What did you bless?"
  },
  { id:'Ph-5', cat:'Ph', title:'Micro-Win Hunt (2m)',
    steps:["Collect 3 micro wins from last 24h."],
    check:"List the 3 wins."
  },
  { id:'Ph-6', cat:'Ph', title:'Time-Bridge (2m)',
    steps:["Write: 'It already happened, I’m just catching up.' (read 3x)"],
    check:"Certainty now (1–10)?"
  },
  // --- Cosmology
  { id:'C-1', cat:'C', title:'11:11 Pause (30s when seen)',
    steps:["When repeating numbers appear: palm on heart:","Say: 'I am in flow. Continue.'"],
    check:"Which number showed up first?"
  },
  { id:'C-2', cat:'C', title:'Prosperity Walk (5m)',
    steps:["Walk today; spot 7 signs of abundance (green, gold, growth)."],
    check:"Name 3 signs you spotted."
  },
  { id:'C-3', cat:'C', title:'Offer to One (2m)',
    steps:["Ask: 'Who needs my gift today?'","Send ONE direct helpful note."],
    check:"Who did you serve?"
  },
  { id:'C-4', cat:'C', title:'Tithe of Attention (2m)',
    steps:["Give 120s undivided attention to a loved one or customer."],
    check:"What brightened?"
  },
  { id:'C-5', cat:'C', title:'Signal Journal (3m)',
    steps:["Write one synchronicity + the action it suggests."],
    check:"What action will you take?"
  },
  { id:'C-6', cat:'C', title:'Lunar Nudge (tonight, 2m)',
    steps:["30s sky-gaze. Whisper: 'Guide my next right move.'"],
    check:"What nudge did you wake with?"
  }
]

function selectTodaysExercise(lastCat, lastShiftScore) {
  if (typeof lastShiftScore==='number' && lastShiftScore < 7) {
    const pool = EXERCISES.filter(e=> e.cat==='P' || e.cat==='N')
    return pool[Math.floor(Math.random()*pool.length)]
  }
  const idx = lastCat ? (ROTATION.indexOf(lastCat)+1) % ROTATION.length : 0
  const pool = EXERCISES.filter(e=> e.cat===ROTATION[idx])
  return pool[Math.floor(Math.random()*pool.length)]
}

/* =========================================================
   Page component
   ========================================================= */
export default function ChatGenie() {
  const firstName = useFirstName()
  const { count, bump } = useProofCounter(12184) // seeds your ticker (dynamic on client)

  const [started, setStarted] = useState(false)
  const [input, setInput]   = useState('')
  const [thinking, setThinking] = useState(false)
  const [inputLocked, setInputLocked] = useState(false) // lock while portal running

  const listRef = useRef(null)
  const inputRef = useRef(null)

  // Message shape supports either text or React node
  const [msgs, setMsgs] = useState([])

  // autoscroll
  useEffect(()=>{ listRef.current?.scrollTo(0, 1e9) }, [msgs, thinking, started])

  // Helpers to push chat content
  function pushText(author, text) {
    setMsgs(m => [...m, { author, text }])
  }
  function pushNode(author, nodeKey, node) {
    setMsgs(m => [...m, { author, key: nodeKey, node }])
  }
  async function streamBubbles(author, bubbles = [], delayMs = 350) {
    for (const b of bubbles) {
      pushText(author, b)
      await new Promise(r => setTimeout(r, delayMs))
    }
  }

  /* =========================================================
     In-chat DAILY PORTAL flow
     ========================================================= */
  const tKey = todayKey()
  const lastMeta = useMemo(()=>{
    if (typeof window==='undefined') return {}
    const raw = localStorage.getItem('genie_daily_lastmeta')
    return raw ? JSON.parse(raw) : {}
  },[])
  const identityLS = () => {
    if (typeof window==='undefined') return { name:'', dream:'' }
    return {
      name: localStorage.getItem('genie_user_name') || '',
      dream: localStorage.getItem('genie_user_dream') || ''
    }
  }
  const recordToday = () => {
    if (typeof window==='undefined') return null
    const raw = localStorage.getItem('genie_daily_'+tKey)
    return raw ? JSON.parse(raw) : null
  }

  function startPortalInChat() {
    setInputLocked(true)
    const id = identityLS()
    const rec = recordToday()

    // If already completed, show done bubble and release chat
    if (rec?.done) {
      pushNode('Genie','portal-complete', (
        <BubbleBox>
          <Title>Portal complete.</Title>
          <P>Your shift is sealed. <b>Next unlock at 5:00 AM</b> ({timeUntilUnlockStr()}).</P>
          <Meta>Today: {rec.exerciseId} • Felt shift {rec.shift ?? '—'}/10 • ✨ Wishes granted: <b>{count.toLocaleString()}</b></Meta>
        </BubbleBox>
      ))
      setInputLocked(false)
      return
    }

    // If identity missing → capture inline
    if (!id.name || !id.dream) {
      pushNode('Genie','identity-capture', (
        <IdentityCaptureBubble
          defaultName={id.name || firstName}
          onSave={({name,dream})=>{
            if (typeof window!=='undefined') {
              localStorage.setItem('genie_user_name', name)
              localStorage.setItem('genie_user_dream', dream)
              localStorage.setItem('mg_first_name', name)
            }
            // proceed to shockcard
            injectShockcardThenRitualThenExercise()
          }}
        />
      ))
      return
    }

    // identity exists → go straight to shockcard → ritual → exercise
    injectShockcardThenRitualThenExercise()
  }

  function injectShockcardThenRitualThenExercise() {
    const shock = ['1111','777','888'][Math.floor(Math.random()*3)]
    // Preselect exercise for the day (persist)
    let rec = recordToday()
    let ex = rec?.exerciseId ? EXERCISES.find(e=> e.id===rec.exerciseId) : null
    if (!ex) {
      ex = selectTodaysExercise(lastMeta.cat, lastMeta.shift)
      if (typeof window!=='undefined') {
        const seed = { exerciseId: ex.id, done:false, step:0 }
        localStorage.setItem('genie_daily_'+tKey, JSON.stringify(seed))
      }
    }

    // 1) Shockcard bubble
    pushNode('Genie','shockcard', (
      <ShockcardBubble code={shock} onContinue={()=>{
        // 2) Ritual seal bubble
        replaceNode('shockcard', (
          <RitualSealBubble onSealed={()=>{
            // 3) Exercise bubble
            replaceNode('shockcard', ( // reuse the same slot
              <ExerciseBubble
                exercise={ex}
                onComplete={({checkin, shift})=>{
                  // persist completion
                  if (typeof window!=='undefined') {
                    const merged = { exerciseId: ex.id, done:true, checkin, shift, finishedAt:new Date().toISOString() }
                    localStorage.setItem('genie_daily_'+tKey, JSON.stringify(merged))
                    localStorage.setItem('genie_daily_lastmeta', JSON.stringify({ cat: ex.cat, shift }))
                  }
                  bump(1)
                  // 4) Completed bubble
                  replaceNode('shockcard', (
                    <BubbleBox>
                      <Title>Portal complete.</Title>
                      <P>Your shift is sealed. <b>Next unlock at 5:00 AM</b> ({timeUntilUnlockStr()}).</P>
                      <Meta>Today: {ex.id} • Category {ex.cat} • Felt shift {shift}/10 • ✨ Wishes granted: <b>{(count+1).toLocaleString()}</b></Meta>
                      {checkin && <Proof>{checkin}</Proof>}
                    </BubbleBox>
                  ))
                  setInputLocked(false)
                }}
              />
            ))
          }} />
        ))
      }} />
    ))
  }

  // replace a node bubble by key
  function replaceNode(nodeKey, newNode) {
    setMsgs(curr => curr.map(m => (m.key===nodeKey ? { ...m, node:newNode } : m)))
  }

  /* =========================================================
     Genie intro and regular chat
     ========================================================= */
  async function onLampClick() {
    if (started) return
    setStarted(true)
    setThinking(true)
    try {
      if (localBrain?.genieIntro) {
        const res = await localBrain.genieIntro({ user: { firstName } })
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
    } catch {
      pushText('Genie','The lamp flickered. Tap again if I go quiet.')
    } finally {
      setThinking(false)
      // Immediately inject the daily portal ritual inside chat
      startPortalInChat()
      inputRef.current?.focus()
    }
  }

  async function callLocalBrain(prompt) {
    if (!localBrain?.genieReply) throw new Error('local-brain-missing')
    const res = await localBrain.genieReply({ input: prompt, user: { firstName } })
    if (Array.isArray(res?.bubbles) && res.bubbles.length) return res.bubbles
    const text = res?.text || String(res || '')
    return text.split(/\n{2,}/g).filter(Boolean)
  }
  async function callApi(prompt) {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ messages:[{ role:'user', content: prompt }], userName:firstName })
    })
    if (!r.ok) { const t=await r.text().catch(()=> ''); throw new Error(`api-error ${r.status}: ${t}`) }
    const data = await r.json()
    const txt = data.text || data.message || ''
    return txt.split(/\n{2,}/g).filter(Boolean)
  }
  async function getReplyBubbles(prompt) {
    try { return await callLocalBrain(prompt) } catch { return await callApi(prompt) }
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
    } finally {
      setThinking(false)
      inputRef.current?.focus()
    }
  }

  async function onNewWish() {
    if (inputLocked) return
    setThinking(true)
    try {
      let seed = null
      if (localBrain?.dailyAssignment) {
        const d = localBrain.dailyAssignment({ name: firstName })
        seed = `**${d.title}** — ${d.why}\n• ${d.steps.join('\n• ')}`
      }
      pushText('Genie', seed || 'It is done — write the one-line wish, then I’ll drop your first 3 moves.')
    } catch {
      pushText('Genie', 'It is done — what’s today’s wish?')
    } finally {
      setThinking(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  /* =========================================================
     Render
     ========================================================= */
  return (
    <>
      <Head>
        <title>Manifestation Genie</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

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

          {/* LAMP IDLE SCREEN */}
          {!started && (
            <div onClick={onLampClick}
                 style={{ height:'60vh', border:'1px dashed #cbd5e1', borderRadius:12, display:'flex',
                   alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, background:'#fff',
                   cursor:'pointer', userSelect:'none' }}>
              <div style={{ fontSize:72, animation:'pulse 2s infinite' }}>🧞‍♂️</div>
              <div style={{ fontSize:16, color:'#334155', textAlign:'center', padding:'0 16px' }}>
                Touch the lamp when you’re ready to interact with the Genie
              </div>
              <style jsx>{`
                @keyframes pulse { 0%{transform:scale(1);opacity:1} 50%{transform:scale(1.08);opacity:.85} 100%{transform:scale(1);opacity:1} }
              `}</style>
            </div>
          )}

          {/* CHAT WINDOW */}
          {started && (
            <>
              <div ref={listRef}
                   style={{ height:'60vh', overflowY:'auto', background:'#fff', border:'1px solid #e2e8f0',
                     borderRadius:12, padding:16 }}>
                {msgs.map((m, i) => (
                  <div key={m.key ?? i}
                       style={{ display:'flex', marginBottom:10, justifyContent: m.author === 'Genie' ? 'flex-start' : 'flex-end' }}>
                    <div style={{
                      maxWidth:'75%',
                      background: m.author === 'Genie' ? '#f1f5f9' : '#fef3c7',
                      border:'1px solid #e2e8f0', padding:'10px 12px', borderRadius:12, whiteSpace:'pre-wrap'
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

              <div style={{ display:'flex', gap:10, marginTop:12 }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
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
                  onClick={onNewWish}
                  disabled={thinking || inputLocked}
                  style={{ background:'#fff', border:'1px solid #cbd5e1', borderRadius:12, padding:'10px 14px',
                    fontWeight:700, cursor:(thinking||inputLocked)?'not-allowed':'pointer' }}>
                  New wish
                </button>
              </div>
            </>
          )}

          <div style={{ textAlign:'center', color:'#64748b', fontSize:12, marginTop:10 }}>
            © {new Date().getFullYear()} Manifestation Genie. Powered by HypnoticMeditations.ai
          </div>
        </div>
      </main>
    </>
  )
}

/* =========================================================
   In-chat bubble components (pure React, no external deps)
   ========================================================= */
function BubbleBox({ children }) {
  return (
    <div style={{ border:`1px solid ${UI.line}`, borderRadius:UI.radius, background:UI.wash,
      boxShadow:`0 10px 30px ${UI.glow}`, padding:12 }}>
      {children}
    </div>
  )
}
function Title({ children }) {
  return <div style={{ fontWeight:900, fontSize:16, color:UI.ink, marginBottom:6 }}>{children}</div>
}
function P({ children }) {
  return <div style={{ color:UI.sub, fontSize:14, marginBottom:8 }}>{children}</div>
}
function Meta({ children }) {
  return <div style={{ color:UI.muted, fontSize:12 }}>{children}</div>
}
function Proof({ children }) {
  return (
    <div style={{ marginTop:10, padding:10, border:`1px dashed ${UI.line}`, borderRadius:10, background:'#fff', color:UI.ink }}>
      {children}
    </div>
  )
}

/* -------- Identity capture (inside chat bubble) -------- */
function IdentityCaptureBubble({ defaultName='Friend', onSave }) {
  const [name, setName] = useState(defaultName || '')
  const [dream, setDream] = useState('')

  const canSave = name.trim().length>=2 && dream.trim().length>=3
  return (
    <BubbleBox>
      <Title>Set your portal</Title>
      <P>Tell Genie who you are and your current dream. One line each.</P>
      <input value={name} onChange={e=>setName(e.target.value)}
             placeholder="Your first name"
             style={{ width:'100%', border:`1px solid ${UI.line}`, borderRadius:10, padding:10, marginBottom:8, fontSize:14 }} />
      <input value={dream} onChange={e=>setDream(e.target.value)}
             placeholder="Your dream (e.g., $1K/day from my store)"
             style={{ width:'100%', border:`1px solid ${UI.line}`, borderRadius:10, padding:10, marginBottom:10, fontSize:14 }} />
      <button disabled={!canSave}
              onClick={()=> onSave?.({name:name.trim(), dream:dream.trim()})}
              style={{ width:'100%', background:`linear-gradient(90deg, ${UI.brand}, ${UI.gold})`, color:'#fff',
                       border:'none', borderRadius:10, padding:'10px 14px', fontWeight:800, opacity: canSave?1:.6 }}>
        Save & open today’s portal
      </button>
      <Meta>One exercise. One seal. One shift. Return tomorrow at <b>5:00 AM</b>.</Meta>
    </BubbleBox>
  )
}

/* -------- Shockcard (animated number code) -------- */
function ShockcardBubble({ code='1111', onContinue }) {
  const cfg = SHOCKCARDS.find(s=>s.id===code) || SHOCKCARDS[0]
  return (
    <BubbleBox>
      <Title>✨ {cfg.title}</Title>
      <P>Stare 7 seconds. Whisper once: “{cfg.mantra}”.</P>
      <div style={{ position:'relative', height:160, margin:'0 auto 12px', maxWidth:320 }}>
        <div style={{ position:'absolute', inset:0, borderRadius:9999,
          background:`conic-gradient(from 0deg, ${UI.brand}, ${UI.gold}, ${UI.brand})`,
          filter:'blur(18px)', opacity:.35, animation:'spin 7s linear infinite' }} />
        <div style={{ position:'absolute', inset:18, borderRadius:9999, border:`2px dashed ${UI.brand}`,
          animation:'pulse 2.5s ease-in-out infinite' }} />
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
          color:UI.ink, fontWeight:900, fontSize:48, letterSpacing:2 }}>{cfg.id}</div>
      </div>
      <button onClick={onContinue}
              style={{ background:`linear-gradient(90deg, ${UI.brand}, ${UI.gold})`, color:'#fff', border:'none',
                       borderRadius:10, padding:'10px 14px', fontWeight:800 }}>
        I felt it — continue
      </button>
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(102,51,204,.35)} 70%{box-shadow:0 0 0 24px rgba(102,51,204,0)} 100%{box-shadow:0 0 0 0 rgba(102,51,204,0)} }
      `}</style>
    </BubbleBox>
  )
}

/* -------- Ritual Seal (glitch button) -------- */
function RitualSealBubble({ onSealed }) {
  const [glitch, setGlitch] = useState(false)
  const click = () => { setGlitch(true); setTimeout(()=>{ setGlitch(false); onSealed?.() }, 1100) }
  return (
    <BubbleBox>
      <Title>Break the loop</Title>
      <P>Click to crack the old pattern. Screen will pulse — that’s your seal.</P>
      <button onClick={click} className={glitch ? 'glx' : ''}
              style={{ background:`linear-gradient(90deg, ${UI.brand}, ${UI.gold})`, color:'#fff',
                       border:'none', borderRadius:10, padding:'10px 14px', fontWeight:800 }}>
        {glitch ? 'Sealing…' : 'Seal today’s shift'}
      </button>
      <style jsx>{`
        .glx { position:relative; overflow:hidden }
        .glx::before, .glx::after {
          content:''; position:absolute; inset:0; background:linear-gradient(90deg, transparent, ${UI.gold}, transparent);
          animation:sweep .9s ease forwards; mix-blend-mode:overlay; opacity:.85;
        }
        .glx::after { animation-delay:.12s }
        @keyframes sweep { 0%{ transform:translateX(-120%) } 100%{ transform:translateX(120%) } }
      `}</style>
    </BubbleBox>
  )
}

/* -------- Exercise Bubble (step-by-step + proof) -------- */
function ExerciseBubble({ exercise, onComplete }) {
  const total = exercise.steps.length
  const [stepIdx, setStepIdx] = useState(0)
  const [checkin, setCheckin] = useState('')
  const [shift, setShift] = useState(8)

  return (
    <BubbleBox>
      <Title>{exercise.title}</Title>
      <Meta>{stepIdx < total ? `${stepIdx+1}/${total+1}` : `${total+1}/${total+1}`}</Meta>

      {stepIdx < total ? (
        <>
          <P>{exercise.steps[stepIdx]}</P>
          <div style={{ display:'flex', gap:8 }}>
            {stepIdx>0 && (
              <button onClick={()=>setStepIdx(s=>Math.max(0,s-1))}
                      style={{ background:'#fff', color:UI.ink, border:`1px solid ${UI.line}`,
                               borderRadius:10, padding:'8px 12px', fontWeight:700 }}>
                Back
              </button>
            )}
            <button onClick={()=>setStepIdx(s=>Math.min(total, s+1))}
                    style={{ background:`linear-gradient(90deg, ${UI.brand}, ${UI.gold})`, color:'#fff',
                             border:'none', borderRadius:10, padding:'8px 12px', fontWeight:800 }}>
              {stepIdx===total-1 ? 'I did it' : 'Next step'}
            </button>
          </div>
        </>
      ) : (
        <>
          <P style={{ fontWeight:700, color:UI.ink }}>Seal your proof.</P>
          <label style={{ display:'block', fontSize:14, color:UI.sub, marginBottom:6 }}>{exercise.check}</label>
          <textarea rows={3} value={checkin} onChange={e=>setCheckin(e.target.value)}
                    placeholder="Type your 1-line check-in…"
                    style={{ width:'100%', border:`1px solid ${UI.line}`, borderRadius:10, padding:10, fontSize:14, marginBottom:10 }} />
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <label style={{ fontSize:13, color:UI.muted }}>Felt shift (1–10):</label>
            <input type="number" min={1} max={10} value={shift} onChange={e=>setShift(e.target.value)}
                   style={{ width:70, border:`1px solid ${UI.line}`, borderRadius:10, padding:'6px 8px', fontSize:14 }} />
          </div>
          <button onClick={()=> checkin.trim() && onComplete?.({checkin, shift:Number(shift)})}
                  style={{ width:'100%', background:`linear-gradient(90deg, ${UI.brand}, ${UI.gold})`, color:'#fff',
                           border:'none', borderRadius:10, padding:'10px 14px', fontWeight:800 }}>
            Submit proof & finish
          </button>
        </>
      )}
    </BubbleBox>
  )
}
