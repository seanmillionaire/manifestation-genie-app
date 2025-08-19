// components/GenieFlow.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../src/supabaseClient'

function Card({ children, style }) {
  return (
    <div style={{
      background:'linear-gradient(180deg, rgba(18,20,44,.9), rgba(10,12,32,.9))',
      border:'1px solid rgba(255,255,255,.12)',
      borderRadius:16, padding:16, boxShadow:'0 10px 30px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.03)',
      ...style
    }}>
      {children}
    </div>
  )
}

function Button({ children, onClick, disabled, variant='primary' }) {
  const base = {
    padding:'10px 14px', borderRadius:10, border:'1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
    fontWeight:600, fontSize:14, marginRight:8
  }
  const styles = variant === 'ghost'
    ? {...base, background:'transparent', border:'1px solid #333', color:'#eaeaea'}
    : {...base, background:'linear-gradient(90deg,var(--brand),var(--brand-2))', color:'#0b0c18'}
  return <button onClick={disabled ? undefined : onClick} style={styles}>{children}</button>
}

function StepHeader({ title, sub }) {
  return (
    <div style={{marginBottom:12}}>
      <div style={{fontSize:18, fontWeight:800}}>{title}</div>
      {sub ? <div style={{opacity:.8, marginTop:6}}>{sub}</div> : null}
    </div>
  )
}

export default function GenieFlow({ session, onDone }) {
  const user = session?.user
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [today] = useState(() => new Date().toISOString().slice(0,10))

  // data state
  const [mood, setMood] = useState(null)                // 'sad'|'neutral'|'happy'
  const [didMeditation, setDidMeditation] = useState(null) // true|false
  const [noMeditationReason, setNoMeditationReason] = useState('')
  const [intent, setIntent] = useState('')
  const [idea, setIdea] = useState('')

  const [steps, setSteps] = useState([])  // [{step_order,label,url,completed}]
  const [generating, setGenerating] = useState(false)

  // wizard index
  const [idx, setIdx] = useState(0) // 0..N

  const greeting = useMemo(() => `✨ Hey ${fullName}, let’s set up today in under a minute.`, [fullName])

  // Load any existing state for today (resume)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!user) return
      setLoading(true)

      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      if (mounted) setFullName(profile?.full_name || user.email?.split('@')[0] || 'Friend')

      const { data: entry } = await supabase.from('daily_entries')
        .select('*').eq('user_id', user.id).eq('entry_date', today).maybeSingle()
      if (entry && mounted) {
        setMood(entry.mood || null)
        setDidMeditation(entry.did_meditation ?? null)
        setNoMeditationReason(entry.no_meditation_reason || '')
      }

      const { data: dIntent } = await supabase.from('daily_intents')
        .select('*').eq('user_id', user.id).eq('entry_date', today).maybeSingle()
      if (dIntent && mounted) {
        setIntent(dIntent.intent || '')
        setIdea(dIntent.idea || '')
      }

      const { data: dSteps } = await supabase.from('action_steps')
        .select('*').eq('user_id', user.id).eq('entry_date', today).order('step_order', { ascending: true })
      if (mounted && dSteps?.length) {
        setSteps(dSteps.map(s => ({ id:s.id, step_order:s.step_order, label:s.label, url:s.url, completed:s.completed })))
      }

      setLoading(false)
    })()
    return () => { mounted = false }
  }, [user, today])

  async function upsertEntry(fields) {
    await supabase.from('daily_entries').upsert({ user_id:user.id, entry_date:today, ...fields }, { onConflict:'user_id,entry_date' })
  }
  async function upsertIntent(nextIntent, nextIdea) {
    await supabase.from('daily_intents').upsert({ user_id:user.id, entry_date:today, intent:nextIntent, idea:nextIdea }, { onConflict:'user_id,entry_date' })
  }

  // Wizard steps (conditional for “reason”)
  const stepKeys = useMemo(() => {
    const base = ['mood','med','maybeReason','intent','idea','plan']
    return didMeditation===false ? base : base.filter(s=>s!=='maybeReason')
  }, [didMeditation])

  const total = stepKeys.length
  const canNext = useMemo(() => {
    const key = stepKeys[idx]
    if (key === 'mood') return !!mood
    if (key === 'med') return didMeditation === true || didMeditation === false
    if (key === 'maybeReason') return true // optional text
    if (key === 'intent') return !!intent.trim()
    if (key === 'idea') return true // optional
    if (key === 'plan') return steps.length > 0
    return false
  }, [idx, stepKeys, mood, didMeditation, intent, steps.length])

  async function doNext() {
    const key = stepKeys[idx]
    if (key === 'mood') await upsertEntry({ mood })
    if (key === 'med') await upsertEntry({ did_meditation: didMeditation, no_meditation_reason: didMeditation? null : (noMeditationReason || null) })
    if (key === 'maybeReason') await upsertEntry({ no_meditation_reason: noMeditationReason || null })
    if (key === 'intent' || key === 'idea') await upsertIntent(intent, idea)

    // Generate plan before moving out of "idea" step if no steps yet
    if (key === 'idea' && steps.length === 0) {
      await generatePlan()
    }

    if (idx < total - 1) setIdx(idx+1)
  }

  function back() { if (idx > 0) setIdx(idx-1) }

  async function generatePlan() {
    setGenerating(true)
    try {
      const r = await fetch('/api/plan', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ intent, idea })
      })
      const json = await r.json()
      const planSteps = json.steps || []

      await supabase.from('action_steps').delete().eq('user_id', user.id).eq('entry_date', today)
      const rows = planSteps.map((s, i) => ({
        user_id: user.id, entry_date: today, step_order: i+1, label: s.label, url: s.url || null
      }))
      if (rows.length) await supabase.from('action_steps').insert(rows)
      setSteps(rows.map(r => ({...r, completed:false})))
    } finally {
      setGenerating(false)
    }
  }

  async function toggleStep(step) {
    const next = steps.map(s => s.step_order === step.step_order ? {...s, completed: !s.completed} : s)
    setSteps(next)
    await supabase.from('action_steps')
      .update({ completed: !step.completed, completed_at: !step.completed ? new Date().toISOString() : null })
      .eq('user_id', user.id).eq('entry_date', today).eq('step_order', step.step_order)
  }

  if (loading) return <div style={{padding:16, color:'#eaeaea'}}>Loading Genie…</div>

  // ---- RENDER ----
  const key = stepKeys[idx]
  return (
    <Card>
      {/* progress */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
        <div style={{fontWeight:700, opacity:.9}}>🧞 Manifestation Genie</div>
        <div style={{fontSize:12, opacity:.75}}>Step {idx+1} of {total}</div>
      </div>

      {key === 'mood' && (
        <>
          <StepHeader title={greeting} sub="Pick what matches right now. It guides how gentle or intense I go today." />
          <div style={{display:'flex', gap:12}}>
            <Button variant={mood==='sad'?'primary':'ghost'}   onClick={()=>setMood('sad')}>😔</Button>
            <Button variant={mood==='neutral'?'primary':'ghost'} onClick={()=>setMood('neutral')}>😐</Button>
            <Button variant={mood==='happy'?'primary':'ghost'} onClick={()=>setMood('happy')}>😃</Button>
          </div>
        </>
      )}

      {key === 'med' && (
        <>
          <StepHeader title="Did you do your Hypnotic Meditation today?" sub="If not yet, no shame — I’ll keep today extra simple." />
          <div style={{display:'flex', gap:10}}>
            <Button variant={didMeditation===true?'primary':'ghost'} onClick={()=>setDidMeditation(true)}>Yes</Button>
            <Button variant={didMeditation===false?'primary':'ghost'} onClick={()=>setDidMeditation(false)}>Not yet</Button>
          </div>
        </>
      )}

      {key === 'maybeReason' && (
        <>
          <StepHeader title="Why not yet?" sub="One line is enough. This helps me remove friction." />
          <textarea
            value={noMeditationReason}
            onChange={e=>setNoMeditationReason(e.target.value)}
            rows={3}
            style={{width:'100%', background:'#0f1022', border:'1px solid var(--soft)', color:'var(--text)', borderRadius:10, padding:'10px 12px'}}
            placeholder="Quick note…"
          />
        </>
      )}

      {key === 'intent' && (
        <>
          <StepHeader title="What’s the ONE thing you want to manifest today?" sub="Keep it specific. Example: “Make money” or “Finish Fiverr UGC gig.”" />
          <input
            value={intent}
            onChange={e=>setIntent(e.target.value)}
            placeholder="e.g., Make money"
            style={{width:'100%', background:'#0f1022', border:'1px solid var(--soft)', color:'var(--text)', borderRadius:10, padding:'10px 12px'}}
          />
        </>
      )}

      {key === 'idea' && (
        <>
          <StepHeader title="Do you already have an idea, or should the Genie help?" sub="Optional. Example: “Fiverr UGC gigs.”" />
          <input
            value={idea}
            onChange={e=>setIdea(e.target.value)}
            placeholder="e.g., Fiverr UGC gigs"
            style={{width:'100%', background:'#0f1022', border:'1px solid var(--soft)', color:'var(--text)', borderRadius:10, padding:'10px 12px'}}
          />
          <div style={{marginTop:12}}>
            <Button onClick={generatePlan} disabled={generating || !intent.trim()}>
              {generating ? 'Summoning plan…' : 'Generate today’s step-by-step'}
            </Button>
          </div>
        </>
      )}

      {key === 'plan' && (
        <>
          <StepHeader title="Your Genie Plan (Today)" sub="Check each one and you’ll feel the momentum flip." />
          {steps.length === 0 ? (
            <div style={{opacity:.8}}>No steps yet. Click Back and generate your plan.</div>
          ) : (
            <ol style={{paddingLeft:18}}>
              {steps.map(step=>(
                <li key={step.step_order} style={{margin:'10px 0'}}>
                  <label style={{display:'flex', alignItems:'center', gap:10}}>
                    <input type="checkbox" checked={!!step.completed} onChange={()=>toggleStep(step)} />
                    <span style={{textDecoration: step.completed ? 'line-through' : 'none'}}>
                      {step.label} {step.url ? <a href={step.url} target="_blank" rel="noreferrer" style={{color:'var(--brand-2)'}}> (open)</a> : null}
                    </span>
                  </label>
                </li>
              ))}
            </ol>
          )}
          <div style={{marginTop:8}}>
            <Button onClick={()=>onDone?.()} disabled={steps.length===0}>Finish & Open Chat</Button>
          </div>
        </>
      )}

      {/* nav */}
      <div style={{marginTop:14, display:'flex', justifyContent:'space-between'}}>
        <Button variant="ghost" onClick={back} disabled={idx===0}>Back</Button>
        <Button onClick={doNext} disabled={!canNext || idx===total-1}>Next</Button>
      </div>
    </Card>
  )
}
