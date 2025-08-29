// pages/flow.js — Vibe Select → Questionnaire → Checklist → Finish (+ Tier + Relief Shortcut)
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../src/supabaseClient'
import GenieFlow from '../components/GenieFlow'

export default function FlowPage(){
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const tier = useMemo(()=> (typeof window!=='undefined' ? localStorage.getItem('mg_tier')||'beginner' : 'beginner'), [])
  const pain = useMemo(()=> (typeof window!=='undefined' ? localStorage.getItem('mg_pain_focus')||'' : ''), [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        setSession(session || null)
      } catch (e) {
        setSession(null)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  function handleDone() {
    router.push('/chat')
  }

  if (loading) return <div style={{padding:24}}>Loading…</div>

  return (
    <div style={{minHeight:'100vh', background:'#fff', color:'#111', padding:'24px 16px'}}>
      <div style={{maxWidth:980, margin:'0 auto'}}>
        {/* Tier + Pain badges */}
        <div style={{
          display:'flex', gap:8, marginBottom:12, alignItems:'center', flexWrap:'wrap'
        }}>
          <span style={{fontSize:12, padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:999}}>
            Tier: <b>{tier}</b>
          </span>
          {pain && (
            <span style={{fontSize:12, padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:999}}>
              Focus: <b>{pain}</b>
            </span>
          )}
          {pain === 'Money stress' && (
            <button
              onClick={()=>{ 
                // Open the global Emergency Reset
                const btn = [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Emergency Reset'))
                if (btn) btn.click()
              }}
              className="btn btn-primary"
              style={{marginLeft:'auto'}}
            >
              Start Emergency Reset
            </button>
          )}
        </div>

        <GenieFlow session={session} onDone={handleDone} />
      </div>
    </div>
  )
}
