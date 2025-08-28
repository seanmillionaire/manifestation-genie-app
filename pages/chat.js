// pages/chat.js — Manifestation Genie
// Flow: vibe → resumeNew → questionnaire → checklist → chat
// Supabase name integration + localStorage persistence

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'

/* =========================
   Language + Metaphors
   ========================= */
const GenieLang = {
  greetings: [
    "The lamp glows… your Genie is here. ✨ What’s stirring in your heart today, {firstName}?",
    "Rub the lamp 🔮 — let’s spark some magic, {firstName}.",
    "The stars whispered your name, {firstName}… shall we begin?",
    "The portal is open 🌌 — step inside, {firstName}."
  ],
  vibePrompt: "Pick your vibe: 🔥 Bold, 🙏 Calm, 💰 Rich.",
  resumeOrNew: "Continue the last wish, or spark a fresh one?",
  resumeLabel: "Continue last wish",
  newLabel: "Start a new wish",
  questPrompts: {
    wish: "What’s the #1 thing you want to manifest? Say it like you mean it.",
    block: "What’s blocking you? One line truth.",
    micro: "What’s 1 micro-move you can make today? Keep it tiny."
  },
  rewards: [
    "YES! That’s the one. Door unlocked.",
    "Love it. The signal’s clear — time to move.",
    "Locked in. You're ready.",
    "Noted. The portal’s open. Step through."
  ],
  tinyCTA: "New wish or keep walking the path?"
}

const cosmicOutros = [
  "The stars tilt toward {topic}. ✨",
  "Orbit set; trajectory locked. 🔮",
  "The lamp hums in your direction. 🌙",
  "Gravity favors your move. 🌌",
  "Signals aligned; door unlocked. 🗝️"
]

const COSMIC_METAPHORS = [
  ['visualize','Like plotting stars before a voyage—see it, then sail.'],
  ['assess','Numbers are telescope lenses—clean them and the path sharpens.'],
  ['schedule','Calendars are gravity; what you schedule, orbits you.'],
  ['contact','Knock and the door vibrates; knock twice and it opens.'],
  ['record','One take beats zero takes—silence never went viral.'],
  ['post','Send the signal so your tribe can tune in.'],
  ['email','A subject line is a comet tail—bright enough to follow.'],
  ['apply','Forms are portals; boring, but they warp reality.'],
  ['practice','Reps are runways—each one smooths the landing.'],
  ['learn','Knowledge is dark matter—unseen, but it shapes your galaxy.']
]

function explainLine(line='') {
  const L = line.trim()
  if (!L) return ''
  let add = 'Do it small and soon—momentum makes its own magic.'
  for (const [key, meta] of COSMIC_METAPHORS) {
    if (new RegExp(`\\b${key}`, 'i').test(L)) { add = meta; break }
  }
  return `✨ ${L}\n<small style="opacity:.75">${add}</small>`
}

function wittyCloser(topic='this') {
  const zingers = [
    `I’ll hold the lamp; you push the door on “${topic}.”`,
    `Pro tip: perfection is a black hole—aim for orbit.`,
    `Cosmos math: tiny action × today > giant plan × someday.`,
    `If the muse calls, let it go to voicemail—ship first.`
  ]
  return zingers[Math.floor(Math.random()*zingers.length)]
}

function addCosmicOutro(s='', topic='this') {
  const line = cosmicOutros[Math.floor(Math.random()*cosmicOutros.length)].replace('{topic}', topic)
  return `${s}\n\n${line}`
}

function formatGenieReply(raw='', topic='this') {
  const bullets = raw.split(/\n+/).map(explainLine).join('\n')
  const withOutro = addCosmicOutro(bullets, topic)
  return `${withOutro}\n\n${wittyCloser(topic)}`
}

/* =========================
   Typewriter helpers
   ========================= */
const newId = () => Math.random().toString(36).slice(2,10)
function createTypingMsg(html) {
  return { id:newId(), role:'assistant', author:'Genie', content:'', full:html, typing:true }
}
function typeNextChunkOnThread(setThread, id, step=2) {
  setThread(prev => prev.map(m => {
    if (m.id !== id || !m.typing) return m
    const nextLen = Math.min(m.content.length+step, m.full.length)
    return { ...m, content:m.full.slice(0,nextLen), typing: nextLen < m.full.length }
  }))
}

/* =========================
   Chat Console
   ========================= */
function ChatConsole({ thread, onSend, onReset, onToggleLike, firstName, onTypeNextChunk }) {
  const [input, setInput] = useState('')
  const endRef = useRef(null)

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}) },[thread])
  useEffect(()=>{
    const t = thread.find(m=>m.role==='assistant'&&m.typing)
    if(!t) return
    const timer=setInterval(()=>onTypeNextChunk?.(t.id),25)
    return ()=>clearInterval(timer)
  },[thread,onTypeNextChunk])

  return (
    <div style={styles.chatWrap}>
      <div style={styles.chatStream}>
        {thread.map(m=>{
          const isAI = m.role==='assistant'
          return (
            <div key={m.id} style={isAI?styles.rowAI:styles.rowUser}>
              <div style={styles.avatar}>{isAI?'🔮':'🙂'}</div>
              <div style={{flex:1}}>
                <div style={isAI?styles.nameLabelAI:styles.nameLabelUser}>
                  {isAI?'Genie':(m.author||firstName||'You')}
                </div>
                <div style={isAI?styles.bubbleAI:styles.bubbleUser}>
                  <div dangerouslySetInnerHTML={{__html: m.content+(m.typing?'<span style="opacity:.6">▋</span>':'')}} />
                </div>
                <div style={styles.reactRow}>
                  {isAI ? (
                    <button
                      style={m.likedByUser?styles.likeBtnActive:styles.likeBtn}
                      onClick={()=>onToggleLike(m.id,'user')}
                    >👍 {m.likedByUser?'Liked':'Like'}</button>
                  ) : (
                    m.likedByGenie ? <span style={styles.likeBadge}>Genie liked this 👍</span>:null
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef}/>
      </div>

      <div style={styles.chatInputRow}>
        <input
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter'&&input.trim()){onSend(input.trim());setInput('')}}}
          placeholder="Speak to your Genie… 🔮"
          style={styles.chatInput}
        />
        <button style={styles.btn} onClick={()=>{if(input.trim()){onSend(input.trim());setInput('')}}}>Send</button>
        <button style={styles.btnGhost} onClick={onReset}>New wish</button>
      </div>
    </div>
  )
}

/* =========================
   Main Page
   ========================= */
export default function ChatPage() {
  const [firstName,setFirstName]=useState('Friend')
  const [phase,setPhase]=useState('vibe')
  const [thread,setThread]=useState([])

  const handleSend=async(text)=>{
    const userMsg={id:newId(),role:'user',author:firstName,content:text}
    setThread(prev=>prev.concat(userMsg))
    try{
      const resp=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:text}]})})
      const data=await resp.json()
      const formatted=formatGenieReply(data.reply||'OK',text)
      setThread(prev=>prev.concat(createTypingMsg(formatted)))
    }catch{
      setThread(prev=>prev.concat({id:newId(),role:'assistant',author:'Genie',content:"The lamp flickered. Try again."}))
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.container}>
        {phase==='vibe'&&(
          <div style={styles.card}>
            <p style={styles.lead}>{GenieLang.vibePrompt}</p>
            <div style={styles.vibeRow}>
              <button style={styles.vibeBtn} onClick={()=>setPhase('chat')}>🔥 Bold</button>
              <button style={styles.vibeBtn} onClick={()=>setPhase('chat')}>🙏 Calm</button>
              <button style={styles.vibeBtn} onClick={()=>setPhase('chat')}>💰 Rich</button>
            </div>
          </div>
        )}
        {phase==='chat'&&(
          <ChatConsole
            thread={thread}
            onSend={handleSend}
            onReset={()=>{setThread([]);setPhase('vibe')}}
            onToggleLike={(id)=>setThread(prev=>prev.map(m=>m.id===id?{...m,likedByUser:!m.likedByUser}:m))}
            firstName={firstName}
            onTypeNextChunk={(id)=>typeNextChunkOnThread(setThread,id)}
          />
        )}
      </div>
    </div>
  )
}

/* =========================
   Styles
   ========================= */
const styles={
  wrap:{minHeight:'100vh',background:'#0c0d14',color:'#fff',padding:24},
  container:{maxWidth:860,margin:'0 auto'},
  card:{background:'#171826',padding:24,borderRadius:14},
  lead:{fontSize:18},
  vibeRow:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginTop:12},
  vibeBtn:{padding:16,borderRadius:12,background:'#222',color:'#fff',cursor:'pointer'},
  chatWrap:{display:'flex',flexDirection:'column',gap:12},
  chatStream:{background:'#101221',padding:16,borderRadius:12,minHeight:380,maxHeight:540,overflowY:'auto'},
  rowAI:{display:'flex',gap:10,margin:'10px 0'},
  rowUser:{display:'flex',gap:10,margin:'10px 0',flexDirection:'row-reverse'},
  avatar:{width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center'},
  nameLabelAI:{fontSize:12,opacity:.7,textAlign:'left'},
  nameLabelUser:{fontSize:12,opacity:.7,textAlign:'right'},
  bubbleAI:{background:'rgba(255,255,255,0.08)',padding:12,borderRadius:12,maxWidth:'80%'},
  bubbleUser:{background:'rgba(255,214,0,0.1)',padding:12,borderRadius:12,maxWidth:'80%'},
  reactRow:{marginTop:4},
  likeBtn:{fontSize:12,background:'transparent',color:'#ccc',border:'1px solid #555',borderRadius:20,padding:'2px 8px',cursor:'pointer'},
  likeBtnActive:{fontSize:12,background:'rgba(255,214,0,.15)',color:'#ffd600',border:'1px solid #ffd600',borderRadius:20,padding:'2px 8px'},
  likeBadge:{fontSize:12,color:'#ffd600'},
  chatInputRow:{display:'flex',gap:8},
  chatInput:{flex:1,padding:12,borderRadius:12,background:'#111',border:'1px solid #333',color:'#fff'},
  btn:{padding:'12px 16px',borderRadius:12,background:'#ffd600',color:'#111',fontWeight:700,cursor:'pointer'},
  btnGhost:{padding:'12px 16px',borderRadius:12,background:'transparent',border:'1px solid #555',color:'#ccc',cursor:'pointer'}
}
