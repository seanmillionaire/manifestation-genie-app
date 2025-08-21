// components/Questionnaire.jsx — One‑Step Accountability Flow (drop‑in)
// - Works with either {session} or {user} prop
// - Focus area → clarify → auto-generate plan → single current step UI
// - Uses existing tables: profiles, daily_entries, daily_intents, action_steps

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'

const todayStr = () => new Date().toISOString().slice(0,10)

function Button({ children, onClick, disabled=false, variant='primary', style }) {
  const base = {
    padding:'12px 16px',
    borderRadius:12,
    border: variant==='ghost' ? '1px solid rgba(0,0,0,0.25)' : '2px solid #000',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
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

export default function Questionnaire({ session, user: userProp, onDone }) {
  const user = userProp || session?.user || null
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('Friend')
  const [today] = useState(() => todayStr())

  // State captured across flow
  const [mood, setMood] = useState(null)                       // 'good' | 'okay' | 'low'
  const [didMeditation, setDidMeditation] = useState(null)     // true|false
  const [noMeditationReason, setNoMeditationReason] = useState('')

  // Focus/clarify (stored in daily_intents as intent/idea)
  const [focus, setFocus] = useState('')                       // category
  const [detail, setDetail] = useState('')                     // clarified target

  // Steps
  const [steps, setSteps] = useState([])                       // [{step_order,label,url,completed}]
  const [generating, setGenerating] = useState(false)

  // Flow idx
  const [idx, setIdx] = useState(0)

  // Refs for Enter‑to‑advance
  const reasonRef = useRef(null)
  const detailRef = useRef(null)

  // ---------- Load profile + today’s rows (robust: never hang loader) ----------
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!user?.id) { if (!cancelled) setLoading(false); return }

      try {
        setLoading(true)

        // name
        const { data: profile } = await supabase
          .from('profiles').select('full_name').eq('id', user.id).maybeSingle()
        if (!cancelled) {
          const first = (profile?.full_name || user.email || 'Friend').trim().split(' ')[0]
          setName(first || 'Friend')
        }

        // daily entries
        const { data: entry } = await supabase
          .from('daily_entries').select('mood,did_meditation,no_meditation_reason')
          .eq('user_id', user.id).eq('entry_date', today).maybeSingle()
        if (!cancelled && entry) {
          setMood(entry.mood ?? null)
          setDidMeditation(typeof entry.did_meditation === 'boolean' ? entry.did_meditation : null)
          setNoMeditationReason(entry.no_meditation_reason || '')
        }

        // focus/clarify
        const { data: dIntent } = await supabase
          .from('daily_intents').select('intent,idea')
          .eq('user_id', user.id).eq('entry_date', today).maybeSingle()
        if (!cancelled && dIntent) {
          setFocus(dIntent.intent || '')
          setDetail(dIntent.idea || '')
        }

        // steps
        const { data: dSteps } = await supabase
          .from('action_steps')
          .select('step_order,label,url,completed')
          .eq('user_id', user.id).eq('entry_date', today)
          .order('step_order', { ascending: true })

        if (!cancelled && dSteps?.length) {
          setSteps(dSteps.map(s => ({
            step_order: s.step_order, label: s.label, url: s.url, completed: s.completed
          })))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id, today])

  // ---------- Flow map ----------
  const stepKeys = useMemo(() => {
    const base = ['mood', 'meditation', 'maybeReason', 'focus', 'clarify', 'plan', 'finish']
    return didMeditation === false ? base : base.filter(s => s !== 'maybeReason')
  }, [didMeditation])
  const total = stepKeys.length
  const key = stepKeys[idx]

  // ---------- Persistence ----------
  async function upsertEntry(fields) {
    if (!user?.id) return
    await supabase.from('daily_entries').upsert(
      { user_id: user.id, entry_date: today, ...fields },
      { onConflict: 'user_id,entry_date' }
    )
  }
  async function upsertIntent(nextIntent, nextIdea) {
    if (!user?.id) return
    await supabase.from('daily_intents').upsert(
      { user_id: user.id, entry_date: today, intent: nextIntent, idea: nextIdea },
      { onConflict: 'user_id,entry_date' }
    )
  }

  // ---------- Auto-advance actions ----------
  async function chooseMood(val) {
    setMood(val); await upsertEntry({ mood: val }); advance()
  }
  async function chooseMeditation(val) {
    setDidMeditation(val)
    await upsertEntry({ did_meditation: val, no_meditation_reason: val ? null : (noMeditationReason || null) })
    jumpTo(val ? 'focus' : 'maybeReason')
  }
  async function saveReasonAndAdvance() {
    await upsertEntry({ no_meditation_reason: noMeditationReason || null })
    jumpTo('focus')
  }
  async function chooseFocus(val) {
    setFocus(val); await upsertIntent(val, detail); jumpTo('clarify')
  }
  async function saveClarifyAndAdvance() {
    const clean = (detail || '').trim()
    await upsertIntent(focus, clean)
    if (!steps.length) await generatePlan(true) // generate then go to plan
    else advance()
  }

  function advance() { setIdx(i => Math.min(i + 1, total - 1)) }
  function jumpTo(stepKey) {
    const nextIndex = stepKeys.indexOf(stepKey)
    if (nextIndex >= 0) setIdx(nextIndex)
  }

  // ---------- Plan generation (uses your existing /api/plan) ----------
  async function generatePlan(advanceToPlan = false) {
    if (!user?.id) return
    const payload = { focus, detail, mood, didMeditation, name } // richer context; server can ignore extras
    setGenerating(true)
    try {
      const r = await fetch('/api/plan', {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
      })
      let json = {}
      try { json = await r.json() } catch {}
      const arr = Array.isArray(json?.steps) ? json.steps : []

      // persist steps
      await supabase.from('action_steps').delete().eq('user_id', user.id).eq('entry_date', today)
      const rows = arr.slice(0,3).map((s, i) => ({
        user_id: user.id, entry_date: today, step_order: i+1,
        label: s.label || `Step ${i+1}`, url: s.url || null, completed: false
      }))
      if (rows.length) await supabase.from('action_steps').insert(rows)
      setSteps(rows.map(r => ({ step_order: r.step_order, label: r.label, url: r.url, completed:false })))
      if (advanceToPlan) jumpTo('plan')
    } finally { setGenerating(false) }
  }

  // ---------- Stepper helpers ----------
  const firstIncomplete = steps.find(s => !s.completed) || null
  const queue = steps.filter(s => !s.completed && s.step_order !== firstIncomplete?.step_order).slice(0,2)

  async function completeNow() {
    const cur = firstIncomplete
    if (!cur || !user?.id) return
    await supabase
      .from('action_steps')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('user_id', user.id).eq('entry_date', today).eq('step_order', cur.step_order)

    const next = steps.map(s => s.step_order === cur.step_order ? { ...s, completed: true } : s)
    setSteps(next)

    // if all done, move to finish
    if (!next.find(s => !s.completed)) jumpTo('finish')
  }

  // Simple client-side “shrink” when stuck (no schema change)
  function shrinkStepLabel(label='') {
    const base = label || ''
    if (base.length <= 60) return `Timebox 5 min: ${base}`
    return `Do the first 5‑min slice of: ${base.slice(0, 72)}…`
  }
  async function imStuck() {
    // don’t alter DB schema; just nudge the current label smaller for this session
    if (!firstIncomplete) return
    const shrunken = shrinkStepLabel(firstIncomplete.label)
    const next = steps.map(s => s.step_order === firstIncomplete.step_order ? { ...s, label: shrunken } : s)
    setSteps(next)
  }

  // ---------- Copy ----------
  const copy = {
    moodQ: `Hey ${name} 👋 … quick check‑in. How’s your vibe today?`,
    medQ:  `Did you listen to your Hypnotic Meditation today?`,
    medNoFollow: `All good. What got in the way? (Press Enter to continue)`,
    medEmpathy: `I hear you. No stress. Today’s not over. One track, one shift — that’s all it takes.`,

    focusQ: `What would you like to focus on manifesting today?`,
    choices: ['Financial freedom','Better health','Loving relationships','Spiritual connection','Other'],
    clarifyIntro: (val) => `Great — you chose “${val}”. Now let’s get more clarity so you’ll hit the target.`,
    clarifyHint: (val) => {
      switch ((val||'').toLowerCase()) {
        case 'financial freedom': return 'e.g., “Make $100 on Etsy”, “Pitch 5 leads”, “List 1 offer on Fiverr”.'
        case 'better health': return 'e.g., “30‑min walk”, “Track meals today”, “Drink 3L water”.'
        case 'loving relationships': return 'e.g., “Call mom 10 min”, “Plan a date”, “Send 3 appreciation texts”.'
        case 'spiritual connection': return 'e.g., “7‑min breathwork”, “Journal 1 page”, “Sunset gratitude walk”.'
        default: return 'e.g., “Finish landing page hero”, “Read 10 pages”, “Declutter desk”.'
      }
    },

    planIntro: `Alright ${name}, do this now (≤15 min):`,
    upNext: `Up next`,
    finishFinal: `✨ Nice work. One brick laid. Keep going when you’re ready.`,
  }

  // autofocus
  useEffect(() => {
    if (key === 'maybeReason') reasonRef.current?.focus()
    if (key === 'clarify')     detailRef.current?.focus()
  }, [key])

  // ---------- Render ----------
  if (loading) return (
    <div className="card" style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.12)'}}>
      Loading Genie Flow…
    </div>
  )

  return (
    <div style={{ background:'#fff', color:'#000' }}>
      {/* header with progress */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
        <div style={{fontWeight:900, fontSize:18}}>🧞 Manifestation Genie</div>
        <div style={{fontSize:13}}>Step {Math.min(idx+1, total)} of {total}</div>
      </div>

      {/* steps */}
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
          <Field><div style={{fontSize:14, color:'#444'}}>{copy.medEmpathy}</div></Field>
        </>
      )}

      {key === 'focus' && (
        <>
          <div style={{fontSize:20, fontWeight:900, marginBottom:8}}>{copy.focusQ}</div>
          <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
            {copy.choices.map((c) => <Button key={c} onClick={()=>chooseFocus(c)}>{c}</Button>)}
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
          <Field>
            <Button onClick={saveClarifyAndAdvance} disabled={generating}>
              {generating ? 'Summoning plan…' : 'Continue'}
            </Button>
          </Field>
        </>
      )}

      {key === 'plan' && (
        <>
          {/* If we somehow got here without steps (e.g., manual refresh), generate now */}
          {(!steps || steps.length === 0) && (
            <Field><Button onClick={()=>generatePlan(false)} disabled={generating}>
              {generating ? 'Summoning plan…' : 'Load today’s steps'}
            </Button></Field>
          )}

          {steps && steps.length > 0 && (
            <div style={{marginTop:6}}>
              <div style={{fontSize:14, opacity:.8, marginBottom:6}}>
                Focus: <strong>{focus || '—'}</strong>{detail ? ` — “${detail}”` : ''}
              </div>
              <div style={{fontSize:20, fontWeight:900, margin:'6px 0 10px'}}>{copy.planIntro}</div>

              {/* ONE current step */}
              {firstIncomplete ? (
                <div style={{
                  padding:'14px 16px',
                  border:'1px solid #222',
                  borderRadius:12,
                  background:'rgba(255,255,255,0.03)'
                }}>
                  <div style={{fontSize:16, fontWeight:800, lineHeight:1.5}}>
                    {firstIncomplete.label}
                    {firstIncomplete.url
                      ? <> — <a href={firstIncomplete.url} target="_blank" rel="noreferrer" style={{ fontWeight:900, color:'#000', textDecoration:'underline' }}>open</a></>
                      : null}
                  </div>

                  <div style={{display:'flex', gap:10, marginTop:12}}>
                    <Button onClick={completeNow}>I did it ✅</Button>
                    <Button variant="ghost" onClick={imStuck}>I’m stuck ⚡</Button>
                  </div>
                </div>
              ) : <div style={{margin:'12px 0'}}>All set for today.</div>}

              {/* Up next */}
              {queue?.length ? (
                <div style={{marginTop:16}}>
                  <div style={{fontSize:13, color:'#444', marginBottom:6}}>{copy.upNext}</div>
                  <ul style={{paddingLeft:20, margin:0}}>
                    {queue.map(s => <li key={s.step_order} style={{margin:'6px 0'}}>{s.label}</li>)}
                  </ul>
                </div>
              ) : null}

              <div style={{fontSize:13, color:'#444', marginTop:12}}>
                Small wins compound. One brick at a time.
              </div>
            </div>
          )}
        </>
      )}

      {key === 'finish' && (
        <>
          <div style={{fontSize:20, fontWeight:900, marginBottom:8}}>{copy.finishFinal}</div>
          <Button onClick={onDone} style={{minWidth:200}}>Back to chat</Button>
        </>
      )}
    </div>
  )
}
