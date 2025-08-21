// components/Questionnaire.jsx — Click-to-Advance Flow (Focus Area → Clarify)
// Implements: focus-area list, reinforced clarity step, no Next/Back
import { useEffect, useMemo, useState, useRef } from 'react'
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
  const [mood, setMood] = useState(null)                      // 'good' | 'okay' | 'low'
  const [didMeditation, setDidMeditation] = useState(null)    // true|false
  const [noMeditationReason, setNoMeditationReason] = useState('')
  const [focus, setFocus] = useState('')                      // chosen category (intent)
  const [detail, setDetail] = useState('')                    // clarified target (idea)
  const [steps, setSteps] = useState([])                      // generated action steps
  const [generating, setGenerating] = useState(false)

  // Step index
  const [idx, setIdx] = useState(0)

  // refs for inputs (Enter-to-advance)
  const reasonRef = useRef(null)
  const detailRef = useRef(null)

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
        setDidMeditation(typeof entry.did_meditation === 'boolean' ? entry.did_meditation : null)
        setNoMeditationReason(entry.no_meditation_reason || '')
      }

      // Intent/Idea (we map intent -> focus, idea -> detail)
      const { data: dIntent } = await supabase
        .from('daily_intents').select('intent,idea')
        .eq('user_id', user.id).eq('entry_date', today).maybeSingle()
      if (mounted && dIntent) {
        setFocus(dIntent.intent || '')
        setDetail(dIntent.idea || '')
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

  // Flow map: mood → meditation → (reason if not) → focus → clarify → plan → finish
  const stepKeys = useMemo(() => {
    const base = ['mood', 'meditation', 'maybeReason', 'focus', 'clarify', 'plan', 'finish']
    return didMeditation === false ? base : base.filter(s => s !== 'maybeReason')
  }, [didMeditation])

  const total = stepKeys.length
  const key = stepKeys[idx]

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

  // === Auto-advance handlers ===
  async function chooseMood(val) {
    setMood(val)
    await upsertEntry({ mood: val })
    advance()
  }

  async function chooseMeditation(val) {
    setDidMeditation(val)
    await upsertEntry({
      did_meditation: val,
      no_meditation_reason: val ? null : (noMeditationReason || null)
    })
    // jump: if "No", go to maybeReason; if "Yes", skip to focus
    if (val === true) {
      jumpTo('focus')
    } else {
      jumpTo('maybeReason')
    }
  }

  async function saveReasonAndAdvance() {
    await upsertEntry({ no_meditation_reason: noMeditationReason || null })
    jumpTo('focus')
  }

  async function chooseFocus(val) {
    setFocus(val)
    await upsertIntent(val, detail) // store category as intent
    jumpTo('clarify')
  }

  async function saveClarifyAndAdvance() {
    const clean = detail.trim()
    // store/refresh both: keep category as intent; detail as idea
    await upsertIntent(focus, clean)
    if (steps.length === 0 && (focus || clean)) {
      await generatePlan(true) // true = advance to plan after generating
    } else {
      advance()
    }
  }

  function advance() {
    setIdx((i) => Math.min(i + 1, total - 1))
  }

  function jumpTo(stepKey) {
    const nextIndex = stepKeys.indexOf(stepKey)
    if (nextIndex >= 0) setIdx(nextIndex)
  }

  function examplesForFocus(val) {
    switch ((val || '').toLowerCase()) {
      case 'financial freedom':
        return 'e.g., “$100 today”, “Close 1 client”, “List 3 items on Etsy”.'
      case 'better health':
        return 'e.g., “30‑min walk”, “Track meals today”, “Drink 3L water”.'
      case 'loving relationships':
        return 'e.g., “Call mom 10 min”, “Plan a date”, “Send 3 appreciation texts”.'
      case 'spiritual connection':
        return 'e.g., “7‑min breathwork”, “Journal 1 page”, “Sunset gratitude walk”.'
      default:
        return 'e.g., “Finish landing page hero”, “Read 10 pages”, “Declutter desk”.'
    }
  }

  async function generatePlan(shouldAdvanceToPlan = false) {
    // Send both the chosen focus category and the clarified detail
    const payload = { intent: focus, idea: detail }
    if (!payload.intent && !payload.idea) return
    setGenerating(true)
    try {
      const r = await fetch('/api/plan', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
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

      if (shouldAdvanceToPlan) {
        jumpTo('plan')
      }
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

  // Copy (final tone)
  const copy = {
    moodQ: `Hey ${name} 👋 … quick check‑in. How’s your vibe today?`,
    medQ:  `Did you listen to your Hypnotic Meditation today?`,
    medNoFollow: `All good. What got in the way? (Press Enter to continue)`,
    medEmpathy: `I hear you. No stress. Today’s not over. One track, one shift — that’s all it takes.`,

    focusQ: `What would you like to focus on manifesting today?`,
    choices: [
      'Financial freedom',
      'Better health',
      'Loving relationships',
      'Spiritual connection',
      'Other'
    ],

    clarifyIntro: (val) => `Great — you chose “${val}”. Now let’s get more clarity on your goal so you hit the target.`,
    clarifyHint: (val) => examplesForFocus(val),

    planIntro: `Perfect. ${name}, here’s your 3‑step plan for today:`,
    planNudge: `When you do this, you’re stacking today’s win on top of your bigger vision.`,
    finishFinal: `✨ That’s your map for today, ${name}. Small wins → big shifts. You ready to roll?`,
  }

  useEffect(() => {
    if (key === 'maybeReason') reasonRef.current?.focus()
    if (key === 'clarify') detailRef.current?.focus()
  }, [key])

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
          <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
            <Button onClick={()=>chooseMood('good')}>😀 Good</Button>
            <Button onClick={()=>chooseMood('okay')}>😐 Okay</Button>
            <Button onClick={()=>chooseMood('low')}>😔 Low</Button>
          </div>
        </>
      )}

      {key === 'meditation' && (
        <>
          <div style={{fontSize:20, fontWeight:900, marginBottom:8}}>{copy.medQ}</div>
          <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
            <Button onClick={()=>chooseMeditation(true)}>✅ Yes</Button>
            <Button onClick={()=>chooseMeditation(false)}>❌ Not yet</Button>
          </div>
        </>
      )}

      {key === 'maybeReason' && (
        <>
          <div style={{fontSize:20, fontWeight:900, marginBottom:6}}>{copy.medNoFollow}</div>
          <Field>
            <textarea
              ref={reasonRef}
              value={noMeditationReason}
              onChange={e=>setNoMeditationReason(e.target.value)}
              onKeyDown={(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); saveReasonAndAdvance() } }}
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

      {key === 'focus' && (
        <>
          <div style={{fontSize:20, fontWeight:900, marginBottom:8}}>{copy.focusQ}</div>
          <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
            {copy.choices.map((c) => (
              <Button key={c} onClick={()=>chooseFocus(c)}>{c}</Button>
            ))}
          </div>
        </>
      )}

      {key === 'clarify' && (
        <>
          <div style={{fontSize:20, fontWeight:900, marginBottom:6}}>
            {copy.clarifyIntro(focus || 'your focus')}
          </div>
          <Field>
            <input
              ref={detailRef}
              value={detail}
              onChange={e=>setDetail(e.target.value)}
              onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); saveClarifyAndAdvance() } }}
              className="textInput"
              placeholder={copy.clarifyHint(focus)}
            />
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
          <div style={{fontSize:14, color:'#444', marginBottom:12}}>{copy.planNudge}</div>
          <Button onClick={()=>jumpTo('finish')} style={{minWidth:180}}>Lock it in</Button>
        </>
      )}

      {key === 'finish' && (
        <>
          <div style={{fontSize:20, fontWeight:900, marginBottom:8}}>{copy.finishFinal}</div>
          <Button onClick={onDone} style={{minWidth:200}}>Yes, let’s go</Button>
        </>
      )}
    </div>
  )
}
