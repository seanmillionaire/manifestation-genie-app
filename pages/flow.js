// pages/flow.js — Vibe Select → Questionnaire → Checklist → Finish
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../src/supabaseClient'
import GenieFlow from '../components/GenieFlow'

export default function FlowPage(){
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted) setSession(session || null)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  function handleDone(){
    // When flow finishes, go to chat console
    router.push('/chat')
  }

  if (loading) return <div style={{padding:24}}>Loading…</div>

  return (
    <div style={{minHeight:'100vh', background:'#fff', color:'#111', padding:'24px'}}>
      <div style={{maxWidth:980, margin:'0 auto'}}>
        <GenieFlow session={session} onDone={handleDone} />
      </div>
    </div>
  )
}
