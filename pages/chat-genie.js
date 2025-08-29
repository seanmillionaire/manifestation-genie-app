// pages/chat-genie.js
// Standalone chat wired to GenieBrain (fixed: no duplicate assignments, no blank bubbles, no inline logo)

import { useEffect, useRef, useState } from 'react'
import { genieReply, dailyAssignment } from '../src/genieBrain'
import { supabase } from '../src/supabaseClient'

function useFirstName(){
  const [firstName, setFirstName] = useState('Friend')
  useEffect(() => {
    (async () => {
      try{
        const cached = localStorage.getItem('mg_first_name')
        if (cached) { setFirstName(cached); return }
        const { data:{ session } } = await supabase.auth.getSession()
        const email = session?.user?.email || ''
        const { data } = await supabase.from('profiles').select('first_name').limit(1).maybeSingle()
        const fn = data?.first_name || (email ? email.split('@')[0] : 'Friend')
        setFirstName(fn); localStorage.setItem('mg_first_name', fn)
      }catch(e){}
    })()
  },[])
  return firstName
}

function Message({ author='Genie', text='' }){
  const mine = author!=='Genie'
  return (
    <div style={{display:'flex', gap:10, margin:'10px 0', alignItems:'flex-start'}}>
      {!mine && (
        <div style={{width:28, height:28, borderRadius:999, background:'#111', color:'#fff', display:'grid', placeItems:'center'}}>🧞‍♂️</div>
      )}
      <div style={{
        background: mine ? '#fff7d6' : '#f2f4f7',
        border:'1px solid #e5e7eb', borderRadius:12, padding:'12px 14px',
        maxWidth:'80%', whiteSpace:'pre-wrap'
      }}>
        {text}
      </div>
    </div>
  )
}

export default function ChatGenie(){
  const firstName = useFirstName()
  const [msgs, setMsgs] = useState([
    { author:'Genie', text:`The lamp hums… I’m listening, ${firstName}. Ask me *anything* or throw a word — I’ll turn it into gold.` }
  ])
  const [input, setInput] = useState('')
  const listRef = useRef(null)
  const droppedRef = useRef(false)

  useEffect(()=>{ listRef.current?.scrollTo(0, 999999) }, [msgs])

  // Drop today's assignment once per day (guard both ref + localStorage)
  useEffect(() => {
    const key = `mg_assignment_dropped_${new Date().toISOString().slice(0,10)}`
    if (droppedRef.current) return
    if (localStorage.getItem(key)==='1') return
    const todays = dailyAssignment({ firstName })
    setMsgs(m => [...m, { author:'Genie', text:
`**Assignment of the Day (${todays.title})**
Why: ${todays.why}
• ${todays.steps.join('\n• ')}` }])
    droppedRef.current = true
    localStorage.setItem(key,'1')
  }, [firstName])

  function stream(text){
    // sentence streamer with empty-part guard
    const parts = text.split(/(?<=[\.\!\?])\s+/).map(p=>p.trim()).filter(Boolean)
    if (parts.length===0){ setMsgs(m=>[...m, {author:'Genie', text}]); return }
    let i = 0
    const pushNext = () => {
      if (i >= parts.length) return
      setMsgs(m => [...m, { author:'Genie', text: parts[i] }])
      i++
      setTimeout(pushNext, 350)
    }
    pushNext()
  }

  async function handleSend(){
    const t = input.trim()
    if (!t) return
    setMsgs(m => [...m, { author:firstName, text:t }])
    setInput('')

    const res = genieReply({ input:t, user:{ firstName } })

    if (res.suggestReset){
      setMsgs(m => [...m, { author:'Genie', text:'I sense money-panic static. Opening the **Emergency Reset** would be wise. 🔧' }])
      setTimeout(()=>{
        const btn = [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Emergency Reset'))
        if (btn) btn.click()
      }, 250)
    }

    stream(res.text)
  }

  return (
    <main style={{minHeight:'calc(100vh - 60px)', background:'#fff'}}>
      <div style={{maxWidth:980, margin:'0 auto', padding:'16px'}}>
        {/* No inline logo here — header already shows it */}
        <div ref={listRef} style={{
          height:'68vh', overflowY:'auto',
          border:'1px solid #e5e7eb', borderRadius:14, padding:14,
          boxShadow:'0 14px 40px rgba(15,23,42,.05)', background:'#fff'
        }}>
          {msgs.map((m,i)=><Message key={i} author={m.author} text={m.text} />)}
        </div>

        <div style={{display:'flex', gap:10, marginTop:12}}>
          <input
            value={input}
            onChange={e=>setInput(e.target.value)}
            placeholder="Speak to your Genie… 🧞‍♂️"
            style={{flex:1, padding:'12px 14px', border:'1px solid #e5e7eb', borderRadius:12}}
            onKeyDown={(e)=>{ if(e.key==='Enter') handleSend() }}
          />
          <button className="btn btn-primary" onClick={handleSend}>Send</button>
          <button
            className="btn btn-ghost"
            onClick={()=>{
              const todays = dailyAssignment({ firstName })
              setMsgs(m => [...m, { author:'Genie', text:
`**Assignment of the Day (${todays.title})**
Why: ${todays.why}
• ${todays.steps.join('\n• ')}` }])
            }}
          >
            New wish
          </button>
        </div>

        <div style={{textAlign:'center', color:'#64748b', fontSize:12, marginTop:10}}>
          © {new Date().getFullYear()} Manifestation Genie. Powered by HypnoticMeditations.ai
        </div>
      </div>
    </main>
  )
}
