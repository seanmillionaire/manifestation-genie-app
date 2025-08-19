// components/GenieFlow.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../src/supabaseClient'

function Section({ title, children }) {
  return (
    <div style={{background:'#0b0b0b', border:'1px solid #222', borderRadius:12, padding:16, marginBottom:16}}>
      <div style={{fontWeight:700, marginBottom:8, fontSize:16}}>{title}</div>
      {children}
    </div>
  )
}

function Button({ children, onClick, disabled, variant='primary' }) {
  const base = {
    padding:'10px 14px',
    borderRadius:10,
    border:'1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    fontWeight:600,
    fontSize:14,
    marginRight:8
  }
  const styles = variant === 'ghost'
    ? {...base, background:'transparent', border:'1px solid #333'}
    : {...base, background:'#ffd54a', color:'#000'}
  return <button onClick={disabled ? undefined : onClick} style={styles}>{children}</button>
}

export default function GenieFlow({ session }) {
  const user = session?.user
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [today, ] = useState(() => new Date().toISOString().slice(0,10))

  // flow state
  const [mood, setMood] = useState(null) // 'sad' | 'neutral' | 'happy'
  const [didMeditation, setDidMeditation] = useState(null) // true | false
  const [noMeditationReason, setNoMeditationReason] = useState('')
  const [intent, setIntent] = useState('')
  const [idea, setIdea] = useState('')
  const [steps, setSteps] = useState([]) // [{step_order,label,url,completed}]
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  // load profile + any existing today data
  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!user) return
      setLoading(true)

      // 1) profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      if (mounted) setFullName(profile?.full_name || user.email?.split('@')[0] || 'Friend')

      // 2) daily entries
      const { data: entry } = await supabase
        .from('daily_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .maybeSingle()

      if (entry) {
        if (mounted) {
          setMood(entry.mood)
          setDidMeditation(entry.did_meditation)
          setNoMeditationReason(entry.no_meditation_reason || '')
        }
      }

      // 3) intent/idea
      const { data: dIntent } = await supabase
        .from('daily_intents')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .maybeSingle()

      if (dIntent) {
        if (mounted) {
          setIntent(dIntent.intent)
          setIdea(dIntent.idea || '')
        }
      }

      // 4) steps
      const { data: dSteps } = await supabase
        .from('action_steps')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .order('step_order', { ascending: true })

      if (mounted && dSteps?.length) {
        setSteps(dSteps.map(s => ({
          id: s.id,
          step_order: s.step_order,
          label: s.label,
          url: s.url,
          completed: s.completed
        })))
      }

      setLoading(false)
    })()
    return () => { mounted = false }
  }, [user, today])

  const greeting = useMemo(() => `✨ Hey ${fullName}, how are you feeling today?`, [fullName])

  async function saveDailyEntry(fields) {
    // upsert by (user_id, entry_date)
    const payload = { user_id: user.id, entry_date: today, ...fields }
    await supabase.from('daily_entries').upsert(payload, { onConflict: 'user_id,entry_date' })
  }

  async function saveIntentIdea(nextIntent, nextIdea) {
    const payload = { user_id: user.id, entry_date: today, intent: nextIntent, idea: nextIdea }
    await supabase.from('daily_intents').upsert(payload, { onConflict: 'user_id,entry_date' })
  }

  async function generatePlan() {
    setSaving(true)
    try {
      const r = await fetch('/api/plan', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ intent, idea })
      })
      const json = await r.json()
      const planSteps = json.steps || []

      // Persist steps
      // Clear existing and insert fresh (simple approach)
      await supabase.from('action_steps')
        .delete()
        .eq('user_id', user.id)
        .eq('entry_date', today)

      const rows = planSteps.map((s, idx) => ({
        user_id: user.id,
        entry_date: today,
        step_order: idx + 1,
        label: s.label,
        url: s.url || null
      }))
      if (rows.length) await supabase.from('action_steps').insert(rows)

      setSteps(rows.map(r => ({...r, completed:false})))
    } finally {
      setSaving(false)
    }
  }

  async function toggleStep(step) {
    const next = steps.map(s => s.step_order === step.step_order ? {...s, completed: !s.completed} : s)
    setSteps(next)
    // persist
    await supabase.from('action_steps')
      .update({ completed: !step.completed, completed_at: !step.completed ? new Date().toISOString() : null })
      .eq('user_id', user.id)
      .eq('entry_date', today)
      .eq('step_order', step.step_order)
  }

  function canGeneratePlan() {
    return Boolean(intent?.trim())
  }

  if (loading) {
    return <div style={{padding:24, color:'#ddd'}}>Loading Genie…</div>
  }

  if (done) {
    return (
      <div style={{padding:24, color:'#ddd'}}>
        <h2 style={{marginTop:0}}>🎉 Done for today</h2>
        <p>Great work. Tiny wins compound. Want a reminder tomorrow to continue? (Set this in your profile.)</p>
      </div>
    )
  }

  return (
    <div style={{maxWidth:720, margin:'0 auto', padding:'24px', color:'#eaeaea'}}>
      <h1 style={{margin:'0 0 8px 0'}}>🧞 Manifestation Genie</h1>
      <div style={{opacity:0.8, marginBottom:16}}>The real manifestation OS. Prompts → Action → Progress.</div>

      <Section title={`${greeting}`}>
        <div style={{display:'flex', gap:12}}>
          <Button variant={mood==='sad'?'primary':'ghost'} onClick={async ()=>{
            setMood('sad'); await saveDailyEntry({ mood:'sad' })
          }}>😔</Button>
          <Button variant={mood==='neutral'?'primary':'ghost'} onClick={async ()=>{
            setMood('neutral'); await saveDailyEntry({ mood:'neutral' })
          }}>😐</Button>
          <Button variant={mood==='happy'?'primary':'ghost'} onClick={async ()=>{
            setMood('happy'); await saveDailyEntry({ mood:'happy' })
          }}>😃</Button>
        </div>
      </Section>

      <Section title="Did you do your Hypnotic Meditation today?">
        <div style={{display:'flex', gap:8}}>
          <Button variant={didMeditation===true?'primary':'ghost'} onClick={async ()=>{
            setDidMeditation(true); setNoMeditationReason(''); await saveDailyEntry({ did_meditation:true, no_meditation_reason:null })
          }}>Yes</Button>
          <Button variant={didMeditation===false?'primary':'ghost'} onClick={async ()=>{
            setDidMeditation(false); await saveDailyEntry({ did_meditation:false })
          }}>Not yet</Button>
        </div>
        {didMeditation===false && (
          <div style={{marginTop:12}}>
            <div style={{opacity:0.8, marginBottom:8}}>Why not yet? (You can type or press the mic on mobile)</div>
            <textarea
              value={noMeditationReason}
              onChange={e=>setNoMeditationReason(e.target.value)}
              onBlur={async ()=>{ await saveDailyEntry({ no_meditation_reason: noMeditationReason || null })}}
              rows={3}
              style={{width:'100%', background:'#121212', border:'1px solid #333', color:'#ddd', padding:10, borderRadius:8}}
              placeholder="Quick note…"
            />
          </div>
        )}
      </Section>

      <Section title="What’s the ONE thing you want to manifest today?">
        <input
          value={intent}
          onChange={e=>setIntent(e.target.value)}
          onBlur={async ()=>{ await saveIntentIdea(intent, idea) }}
          placeholder="e.g., Make money"
          style={{width:'100%', background:'#121212', border:'1px solid #333', color:'#ddd', padding:10, borderRadius:8}}
        />
      </Section>

      <Section title="Do you already have an idea, or should the Genie help?">
        <input
          value={idea}
          onChange={e=>setIdea(e.target.value)}
          onBlur={async ()=>{ await saveIntentIdea(intent, idea) }}
          placeholder="e.g., Fiverr UGC gigs"
          style={{width:'100%', background:'#121212', border:'1px solid #333', color:'#ddd', padding:10, borderRadius:8}}
        />
        <div style={{marginTop:12}}>
          <Button onClick={generatePlan} disabled={!canGeneratePlan() || saving}>
            {saving ? 'Summoning plan…' : 'Generate today’s step-by-step'}
          </Button>
        </div>
      </Section>

      {steps?.length > 0 && (
        <Section title="Your Genie Plan (Today)">
          <ol style={{paddingLeft:18}}>
            {steps.map(step=>(
              <li key={step.step_order} style={{margin:'10px 0'}}>
                <label style={{display:'flex', alignItems:'center', gap:10}}>
                  <input type="checkbox" checked={!!step.completed} onChange={()=>toggleStep(step)} />
                  <span style={{textDecoration: step.completed ? 'line-through' : 'none'}}>
                    {step.label} {step.url ? <a href={step.url} target="_blank" rel="noreferrer" style={{color:'#ffd54a'}}> (open)</a> : null}
                  </span>
                </label>
              </li>
            ))}
          </ol>
          <div>
            <Button onClick={()=>setDone(true)}>I’m done for today</Button>
          </div>
        </Section>
      )}
    </div>
  )
}
