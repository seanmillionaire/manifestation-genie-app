// components/Questionnaire.jsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../src/supabaseClient'

const todayStr = () => new Date().toISOString().slice(0,10)

function Button({ children, onClick, disabled=false, variant='primary', style }) {
  const base = {
    padding:'12px 16px', borderRadius:12, border:'2px solid #000',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
    fontWeight:800, fontSize:16, lineHeight:1,
    background: variant==='ghost' ? '#fff' : '#000',
    color: variant==='ghost' ? '#000' : '#fff',
    ...style
  }
  return <button type="button" onClick={disabled ? undefined : onClick} style={base}>{children}</button>
}

function Field({ children, style }) {
  return <div style={{marginTop:12, ...style}}>{children}</div>
}

export default function Questionnaire({ session, onDone }) {
  const user = session?.user
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('Friend')
  const [today] = useState(() => todayStr())

  // Flow state
  const [mood, setMood] = useState(null)                 // 'good' | 'okay' | 'low'
  const [didMeditation, setDidMeditation] = useState(null) // true|false
  const [noMeditationReason, setNoMeditationReason] = useState('')
  const [intent, setIntent] = useState('')               // the “one thing”
  const [idea, setIdea] = useState('')                   // clarified variant (optional)
  const [steps, setSteps] = useState([])                 // generated action steps
  const [generating, setGenerating] = useState(false)

  // Step index
  const [idx, setIdx] = useState(0)

  // Load profile + any today rows to resume
  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!user) return
      setLoading(true)

      // Name
      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      if (mounted) {
        const first = (profile?.full_name || user.email || 'Friend').trim().split(' ')[0]
        setName(first || 'Friend')
      }

      // Daily entries
      const { data: entry } = await supabase
        .from('daily_entries').select('mood,did_meditation,no_meditation_reason')
        .eq('user_id', user.id).eq('entry_date', today).maybeSingle()
      if (mounted && entry) {
        setMood(entry.mood || null)
        setDidMeditation(
          typeof entry.did_meditation === 'boolean' ? entry.did_meditation : null
        )
        setNoMeditationReason(entry.no_meditation_reason || '')
      }

      // Intent/Idea
      const { data: dIntent } = await supabase
        .from('daily_intents').select('intent,idea')
        .eq('user_id', user.id).eq('entry_date', today).maybeSingle()
      if (mounted && dIntent) {
        setIntent(dIntent.intent || '')
        setIdea(dIntent.idea || '')
      }

      // Steps
      const { data: dSteps } = await supabase
        .from('action_steps')
        .select('step_order,label,url,completed')
        .eq('user_id', user.id).eq('entry_date', today)
        .order('step_order', { ascending: true })

      if (mounted && dSteps?.length) {
        setSteps(dSteps.map(s => ({
          step_order: s.step_order, label: s.label, url: s.url, completed: s.completed
        })))
      }

      setLoading(false)
    })()
    return () => { mounted = false }
  }, [user, today])

  // Flow map: mood → meditation → (reason if not) → goal → clarify → plan → finish
  const stepKeys = useMemo(() => {
    const base = ['mood', 'meditation', 'maybeReason', 'goal', 'clarify', 'plan', 'finish']
    return didMeditation === false ? base : base.filter(s => s !== 'maybeReason')
  }, [didMeditation])

  const total = stepKeys.length
  const key = stepKeys[idx]

  // Guards to enable Next
  const canNext = useMemo(() => {
    if (key === 'mood') return !!mood
    if (key === 'meditation') return didMeditation === true || didMeditation === false
    if (key === 'maybeReason') return true // optional text
    if (key === 'goal') return !!intent.trim()
    if (key === 'clarify') return true     // optional idea
    if (key === 'plan') return steps.length > 0
    if (key === 'finish') return true
    return false
  }, [key, mood, didMeditation, intent, steps.length])

  // Persistence helpers
  async function upsertEntry(fields) {
    await supabase.from('daily_entries').upsert(
      { user_id: user.id, entry_date: today, ...fields },
      { onConflict: 'user_id,entry_date' }
    )
  }
  async function upsertIntent(nextIntent, nextIdea) {
    await supabase.from('daily_intents').upsert(
      { user_id: user.id, entry_date: today, intent: nextIntent, idea: nextIdea },
      { onConflict: 'user_id,entry_date' }
    )
  }

  async function generatePlan() {
    if (!intent.trim()) return
    setGenerating(true)
    try {
      const r = await fetch('/api/plan', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ intent, idea })
      })
      const json = await r.json()
      const planSteps = Array.isArray(json?.steps) ? json.steps : []

      // Save to DB
      await supabase.from('action_steps')
        .delete()
        .eq('user_id', user.id)
        .eq('entry_date', today)

      const rows = planSteps.map((s, i) => ({
        user_id: user.id,
        entry_date: today,
        step_order: i + 1,
        label: s.label || `Step ${i+1}`,
        url: s.url || null,
        completed: false
      }))
      if (rows.length) await supabase.from('action_steps').insert(rows)

      setSteps(rows.map(r => ({
        step_order: r.step_order, label: r.label, url: r.url, completed:false
      })))
    } finally {
      setGenerating(false)
    }
  }

  async function toggleStep(step) {
    const next = steps.map(s => s.step_order === step.step_order
      ? { ...s, completed: !s.completed }
      : s
    )
    setSteps(next)
    await supabase.from('action_steps')
      .update({ completed: !step.completed, completed_at: !step.completed ? new Date().toISOString() : null })
      .eq('user_id', user.id).eq('entry_date', today).eq('step_order', step.step_order)
  }

  // Navigation
  async function next() {
    // Save current step results before moving forward
    if (key === 'mood') await upsertEntry({ mood })
    if (key === 'meditation')
      await upsertEntry({
        did_meditation: didMeditation,
        no_meditation_reason: didMeditation ? null : (noMeditationReason || null)
      })
    if (key === 'maybeReason')
      await upsertEntry({ no_meditation_reason: noMeditationReason || null })
    if (key === 'goal' || key === 'clarify')
      await upsertIntent(intent, idea)

    // If leaving clarify without steps yet, auto-generate
    if (key === 'clarify' && steps.length === 0 && intent.trim()) {
      await generatePlan()
    }

    if (idx < total - 1) setIdx(idx + 1)
  }
  function back() { if (idx > 0) setIdx(idx - 1) }

  // Copy (final tone)
  const copy = {
    moodQ: `Hey ${name} 👋 … quick check‑in. How’s your vibe today?`,
    medQ:  `Did you listen to your Hypnotic Meditation yet?`,
    medNoFollow: `All good. What got in the way?`,
    medEmpathy: `I hear you. No stress. Today’s not over. One track, one shift — that’s all it takes.`,
    goalQ: `Cool. Now tell me—what’s one thing you want to bring into reality today?`,
    goalExamples: `Examples: “$100 today” / “Go for a walk” / “Meet someone new”`,
    clarifyQ: `Can you be more clear? The clearer the target, the easier the Genie can help.`,
    clarifyHints: `e.g., “make $100 on Fiverr” or “30‑minute walk”.`,
    planIntro: `Alright ${name}, here’s your 3‑step plan for today:`,
    planNudge: `When you do this, you’re stacking today’s win on top of your bigger vision.`,
    finishFinal: `✨ That’s your map for today, ${name}. Small wins → big shifts. You ready to roll?`,
  }

  if (loading) return <div>Loading…</div>

  return (
    <div style={{ background:'#fff', color:'#000' }}>
      {/* header with progress */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
        <div style={{fontWeight:900, fontSize:18}}>🧞 Manifestation Genie</div>
        <div style={{fontSize:13}}>Step {idx+1} of {total}</div>
      </div>

      {/* step body */}
      {key === 'mood' && (
        <>
          <div style={{fontSize:20, fontWeight:900, marginBottom:8}}>{copy.moodQ}</div>
          <div style={{display:'flex', gap:10}}>
            <Button variant={mood==='good'?'primary':'ghost'} onClick={()=>setMood('good')}>😀 Good</Button>
            <Button variant={mood==='okay'?'primary':'ghost'} onClick={()=>setMood('okay')}>😐 Okay</Button>
            <Button variant={mood==='low'?'primary':'ghost'} onClick={()=>setMood('low')}>😔 Low</Button>
          </div>
        </>
      )}

      {key === 'meditation' && (
        <>
          <div style={{fontSize:20, fontWeight:900, marginBottom:8}}>{copy.medQ}</div>
          <div style={{display:'flex', gap:10}}>
            <Button variant={didMeditation===true?'primary':'ghost'} onClick={()=>setDidMeditation(true)}>✅ Yes</Button>
            <Button variant={didMeditation===false?'primary':'ghost'} onClick={()=>setDidMeditation(false)}>❌ Not yet</Button>
          </div>
        </>
      )}

      {key === 'maybeReason' && (
        <>
          <div style={{fontSize:20, fontWeight:900, marginBottom:6}}>{copy.medNoFollow}</div>
          <Field>
            <textarea
              value={noMeditationReason}
              onChange={e=>setNoMeditationReason(e.target.value)}
              rows={3}
              className="textArea"
              style={{ width:'100%' }}
              placeholder="Type a quick note…"
            />
          </Field>
          <Field>
            <div style={{fontSize:14, color:'#444'}}>{copy.medEmpathy}</div>
          </Field>
        </>
      )}

      {key === 'goal' && (
        <>
          <div style={{fontSize:20, fontWeight:900, marginBottom:6}}>{copy.goalQ}</div>
          <Field>
            <input
              value={intent}
              onChange={e=>setIntent(e.target.value)}
              className="textInput"
              placeholder='e.g., "Make $100 today"'
            />
          </Field>
          <Field>
            <div style={{fontSize:14, color:'#444'}}>{copy.goalExamples}</div>
          </Field>
        </>
      )}

      {key === 'clarify' && (
        <>
          <div style={{fontSize:20, fontWeight:900, marginBottom:6}}>{copy.clarifyQ}</div>
          <Field>
            <input
              value={idea}
              onChange={e=>setIdea(e.target.value)}
              className="textInput"
              placeholder='e.g., "Make $100 on Fiverr"'
            />
          </Field>
          <Field>
            <div style={{fontSize:14, color:'#444'}}>{copy.clarifyHints}</div>
          </Field>
          <Field>
            <Button onClick={generatePlan} disabled={generating || !intent.trim()}>
              {generating ? 'Summoning plan…' : 'Generate 3‑step plan'}
            </Button>
          </Field>
        </>
      )}

      {key === 'plan' && (
        <>
          <div style={{fontSize:20, fontWeight:900, marginBottom:8}}>{copy.planIntro}</div>
          {steps.length === 0 ? (
            <div>No steps yet. Click “Generate 3‑step plan”.</div>
          ) : (
            <ol style={{paddingLeft:20, margin:'8px 0 14px'}}>
              {steps.map(step=>(
                <li key={step.step_order} style={{margin:'12px 0'}}>
                  <label style={{display:'flex', alignItems:'center', gap:10}}>
                    <input type="checkbox" checked={!!step.completed} onChange={()=>toggleStep(step)} />
                    <span style={{textDecoration: step.completed ? 'line-through' : 'none'}}>
                      {step.label}
                      {step.url
                        ? <> <a href={step.url} target="_blank" rel="noreferrer" style={{ fontWeight:900, color:'#000', textDecoration:'underline' }}>open</a></>
                        : null}
                    </span>
                  </label>
                </li>
              ))}
            </ol>
          )}
          <div style={{fontSize:14, color:'#444'}}>{copy.planNudge}</div>
        </>
      )}

      {key === 'finish' && (
        <>
          <div style={{fontSize:20, fontWeight:900, marginBottom:8}}>{copy.finishFinal}</div>
        </>
      )}

      {/* nav */}
      <div style={{marginTop:16, display:'flex', justifyContent:'space-between'}}>
        <Button variant="ghost" onClick={back} disabled={idx===0} style={{minWidth:110}}>Back</Button>
        {key !== 'finish'
          ? <Button onClick={next} disabled={!canNext} style={{minWidth:110}}>Next</Button>
          : <Button onClick={onDone} style={{minWidth:160}}>Yes, let’s go</Button>
        }
      </div>
    </div>
  )
}
