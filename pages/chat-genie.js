// pages/chat-genie.js
// Standalone chat page wired to GenieBrain (wit + mysticism + assignments + numerology)
// Drop in and visit /chat-genie. Rename to chat.js when you're ready.

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
        // minimal attempt: try profiles table if you have it
        const { data } = await supabase.from('profiles').select('first_name').limit(1).maybeSingle()
        if (data?.first_name){ setFirstName(data.first_name); localStorage.setItem('mg_first_name', data.first_name) }
        else if (email) { setFirstName(email.split('@')[0]) }
      }catch(e){}
    })()
  },[])
  return firstName
}

function Message({ author='Genie', text='' }){
  const mine = author!=='Genie'
  return (
    <div style={{display:'flex', gap:10, margin:'10px 0', alignItems:'flex-start'}}>
      {!mine && <div style={{width:28, height:28, borderRadius:999, background:'#111', color:'#fff', display:'grid', placeItems:'center'}}>🧞‍♂️</div>}
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
    { author:'Genie', text:`The lamp hums… I’m listening, ${firstName}. Ask me *anything* or just throw a word. I’ll turn it into gold.` }
  ])
  const [input, setInput] = useState('')
  const listRef = useRef(null)

  useEffect(()=>{ listRef.current?.scrollTo(0, 999999) }, [msgs])

  useEffect(() => {
    // Drop today's assignment on entry (once)
    const todays = dailyAssignment({ firstName })
    setMsgs(m => [...m, { author:'Genie', text:
`**Assignment of the Day (${todays.title})**
Why: ${todays.why}
• ${todays.steps.join('\n• ')}` }])
  }, [firstName])

  function stream(text){
    // simple type-stream effect: push sentence by sentence
    const parts = text.split(/(?<=[\.\!\?])\s+/)
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
      // try to click the global widget if you installed it
      setTimeout(()=>{
        const btn = [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Emergency Reset'))
        if (btn) btn.click()
      }, 250)
    }

    // stream the composed message
    stream(res.text)
  }

  return (
    <main style={{minHeight:'calc(100vh - 60px)', background:'#fff'}}>
      <div style={{maxWidth:980, margin:'0 auto', padding:'16px'}}>
        <div style={{textAlign:'center', margin:'6px 0 8px'}}>
          <img src="/logo.png" alt="Manifestation Genie" style={{height:34}} />
        </div>

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
