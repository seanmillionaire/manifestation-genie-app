// components/GenieFlow.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../src/supabaseClient'

function Button({ children, onClick, disabled, variant='primary', style }) {
  const base = {
    padding:'10px 14px', borderRadius:8, border:'2px solid #000',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
    fontWeight:800, fontSize:14,
    background: variant==='ghost' ? '#fff' : '#000',
    color: variant==='ghost' ? '#000' : '#fff',
    ...style
  }
  return <button type="button" onClick={disabled ? undefined : onClick} style={base}>{children}</button>
}

function Field({ children }) {
  return <div style={{marginTop:10}}>{children}</div>
}

function todayStr() {
  return new Date().toISOString().slice(0,10)
}

export default function GenieFlow({ session, onDone }) {
  const user = session?.user
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [today] = useState(() => todayStr())

  const [mood, setMood] = useState(null)                 // 'sad'|'neutral'|'happy'
  const [didMeditation, setDidMeditation] = useState(null) // true|false
  const [noMeditationReason, setNoMeditationReason] = useState('')
  const [intent, setIntent] = useState('')
  const [idea, setIdea] = useState('')
  const [steps, setSteps] = useState([])
  const [generating, setGenerating] = useState(false)

  const [idx, setIdx] = useState(0)

  const greeting = useMemo(() => `✨ Hey ${userName}, let’s get set up for today.`)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!user) return
      setLoading(true)

      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      if (mounted) setFullName(profile?.full_name || user.email?.split('@')[0] || 'Friend')

      const { data: entry } = await supabase
        .from('daily_entries').select('*').eq('user_id', user.id).eq('entry_date', today).maybeSingle()
      if (entry && mounted) {
        setMood(entry.mood ?? null)
        setDidMeditation(entry.did_meditation ?? null)
        setNoMeditationReason(entry.no_meditation_reason || '')
      }

      const { data: dIntent } = await supabase
        .from('daily_intents').select('*').eq('user_id', user.id).eq('entry_date', today).maybeSingle()
      if (dIntent && mounted) {
        setIntent(dIntent.intent || '')
        setIdea(dIntent.idea || '')
      }

      const { data: dSteps } = await supabase
        .from('action_steps').select('*').eq('user_id', user.id).eq('entry_date', today).order('step_order', { ascending: true })
      if (mounted && dSteps?.length) {
        setSteps(dSteps.map(s => ({ id:s.id, step_order:s.step_order, label:s.label, url:s.url, completed:s.completed })))
      }

      setLoading(false)
    })()
    return () => { mounted = false }
  }, [user, today])

  async function upsertEntry(fields) {
    await supabase.from('daily_entries').upsert(
      { user_id:user.id, entry_date:today, ...fields },
      { onConflict:'user_id,entry_date' }
    )
  }
  async function upsertIntent(nextIntent, nextIdea) {
    await supabase.from('daily_intents').upsert(
      { user_id:user.id, entry_date:today, intent:nextIntent, idea:nextIdea },
      { onConflict:'user_id,entry_date' }
    )
  }

  const stepKeys = useMemo(() => {
    const base = ['mood','med','maybeReason','intent','idea','plan']
    return didMeditation === false ? base : base.filter(s => s !== 'maybeReason')
  }, [didMeditation])
  const total = stepKeys.length

  const canNext = useMemo(() => {
    const key = stepKeys[idx]
    if (key === 'mood') return !!mood
    if (key === 'med') return didMeditation === true || didMeditation === false
    if (key === 'maybeReason') return true
    if (key === 'intent') return !!intent.trim()
    if (key === 'idea') return true
    if (key === 'plan') return steps.length > 0
    return false
  }, [idx, stepKeys, mood, didMeditation, intent, steps.length])

  async function doNext() {
    const key = stepKeys[idx]
    if (key === 'mood') await upsertEntry({ mood })
    if (key === 'med') await upsertEntry({ did_meditation: didMeditation, no_meditation_reason: didMeditation ? null : (noMeditationReason || null) })
    if (key === 'maybeReason') await upsertEntry({ no_meditation_reason: noMeditationReason || null })
    if (key === 'intent' || key === 'idea') await upsertIntent(intent, idea)

    if (key === 'idea' && steps.length === 0 && intent.trim()) {
      await generatePlan()
    }
    if (idx < total - 1) setIdx(idx + 1)
  }
  function back() { if (idx > 0) setIdx(idx - 1) }

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
        user_id:user.id, entry_date:today, step_order:i+1, label:s.label, url:s.url || null
      }))
      if (rows.length) await supabase.from('action_steps').insert(rows)
      setSteps(rows.map(r => ({ ...r, completed:false })))
    } finally {
      setGenerating(false)
    }
  }

  async function toggleStep(step) {
    const next = steps.map(s => s.step_order === step.step_order ? { ...s, completed: !s.completed } : s)
    setSteps(next)
    await supabase.from('action_steps')
      .update({ completed: !step.completed, completed_at: !step.completed ? new Date().toISOString() : null })
      .eq('user_id', user.id).eq('entry_date', today).eq('step_order', step.step_order)
  }

  if (loading) return <div>Loading Genie…</div>

  const key = stepKeys[idx]

  return (
    <div style={{ background:'#fff', color:'#000' }}>
      {/* progress header */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
        <div style={{fontWeight:900}}>🧞 Manifestation Genie</div>
        <div style={{fontSize:12}}>Step {idx+1} of {total}</div>
      </div>

      {key === 'mood' && (
        <>
          <div style={{fontSize:18, fontWeight:900, marginBottom:6}}>{greeting}</div>
          <div style={{opacity:.9, marginBottom:12}}>Pick what matches right now.</div>
          <div style={{display:'flex', gap:8}}>
            <Button variant={mood==='sad'?'primary':'ghost'} onClick={()=>setMood('sad')}>😔</Button>
            <Button variant={mood==='neutral'?'primary':'ghost'} onClick={()=>setMood('neutral')}>😐</Button>
            <Button variant={mood==='happy'?'primary':'ghost'} onClick={()=>setMood('happy')}>😃</Button>
          </div>
        </>
      )}

      {key === 'med' && (
        <>
          <div style={{fontSize:18, fontWeight:900, marginBottom:6}}>Did you do your Hypnotic Meditation today?</div>
          <div style={{opacity:.9, marginBottom:12}}>If not yet, I’ll keep today extra simple.</div>
          <div style={{display:'flex', gap:8}}>
            <Button variant={didMeditation===true?'primary':'ghost'} onClick={()=>setDidMeditation(true)}>Yes</Button>
            <Button variant={didMeditation===false?'primary':'ghost'} onClick={()=>setDidMeditation(false)}>Not yet</Button>
          </div>
        </>
      )}

      {key === 'maybeReason' && (
        <>
          <div style={{fontSize:18, fontWeight:900, marginBottom:6}}>Why not yet?</div>
          <Field>
            <textarea
              value={noMeditationReason}
              onChange={e=>setNoMeditationReason(e.target.value)}
              rows={3}
              style={{ width:'100%', border:'2px solid #000', borderRadius:8, padding:'10px 12px', fontSize:14, background:'#fff', color:'#000' }}
              placeholder="One line is enough…"
            />
          </Field>
        </>
      )}

      {key === 'intent' && (
        <>
          <div style={{fontSize:18, fontWeight:900, marginBottom:6}}>What’s the ONE thing you want to manifest today?</div>
          <Field>
            <input
              value={intent}
              onChange={e=>setIntent(e.target.value)}
              placeholder="e.g., Make money"
              style={{ width:'100%', border:'2px solid #000', borderRadius:8, padding:'10px 12px', fontSize:14, background:'#fff', color:'#000' }}
            />
          </Field>
        </>
      )}

      {key === 'idea' && (
        <>
          <div style={{fontSize:18, fontWeight:900, marginBottom:6}}>Do you already have an idea, or should I help?</div>
          <Field>
            <input
              value={idea}
              onChange={e=>setIdea(e.target.value)}
              placeholder="e.g., Fiverr UGC gigs"
              style={{ width:'100%', border:'2px solid #000', borderRadius:8, padding:'10px 12px', fontSize:14, background:'#fff', color:'#000' }}
            />
          </Field>
          <Field>
            <Button onClick={generatePlan} disabled={generating || !intent.trim()}>
              {generating ? 'Summoning plan…' : 'Generate today’s step-by-step'}
            </Button>
          </Field>
        </>
      )}

      {key === 'plan' && (
        <>
          <div style={{fontSize:18, fontWeight:900, marginBottom:6}}>Your Genie Plan (Today)</div>
          {steps.length === 0 ? (
            <div>No steps yet. Click Back and generate your plan.</div>
          ) : (
            <ol style={{paddingLeft:18, marginTop:8}}>
              {steps.map(step=>(
                <li key={step.step_order} style={{margin:'10px 0'}}>
                  <label style={{display:'flex', alignItems:'center', gap:10}}>
                    <input type="checkbox" checked={!!step.completed} onChange={()=>toggleStep(step)} />
                    <span style={{textDecoration: step.completed ? 'line-through' : 'none'}}>
                      {step.label} {step.url ? <a href={step.url} target="_blank" rel="noreferrer" style={{ fontWeight:900, color:'#000' }}> (open)</a> : null}
                    </span>
                  </label>
                </li>
              ))}
            </ol>
          )}
          <Field>
            <Button onClick={()=>onDone?.()}>Finish & Open Chat</Button>
          </Field>
        </>
      )}

      {/* nav buttons */}
      <div style={{marginTop:14, display:'flex', justifyContent:'space-between'}}>
        <Button variant="ghost" onClick={()=>{ if (idx>0) setIdx(idx-1) }} style={{minWidth:96}}>Back</Button>
        <Button onClick={doNext} disabled={!canNext || idx===total-1} style={{minWidth:96}}>Next</Button>
      </div>
    </div>
  )
}
