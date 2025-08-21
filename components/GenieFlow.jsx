// components/GenieFlow.jsx — Plan step = single-step focus with click‑baity launcher
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

function todayStr() { return new Date().toISOString().slice(0,10) }

// 1→first, 2→second, 3→third, else→next
function ordinalWord(n) {
  return ['first','second','third'][n-1] || 'next'
}

export default function GenieFlow({ session, onDone }) {
  const user = session?.user
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [today] = useState(() => todayStr())

  const [mood, setMood] = useState(null)                   // 'sad'|'neutral'|'happy'
  const [didMeditation, setDidMeditation] = useState(null) // true|false
  const [noMeditationReason, setNoMeditationReason] = useState('')
  const [intent, setIntent] = useState('')
  const [idea, setIdea] = useState('')
  const [steps, setSteps] = useState([])
  const [generating, setGenerating] = useState(false)

  const [idx, setIdx] = useState(0)

  // Load profile + today’s state
  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!user) { setLoading(false); return }
      setLoading(true)

      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      if (mounted) setFullName(profile?.full_name || user.email?.split('@')[0] || 'Friend')

      const { data: entry } = await supabase
        .from('daily_entries').select('*').eq('user_id', user.id).eq('entry_date', today).maybeSingle()
      if (entry && mounted) {
        setMood(entry.mood ?? null)
        setDidMeditation(entry.did_meditation ?? null)
        setNoMedititationReason?.(entry.no_meditation_reason || '') // safeguard if function typo
        setNoMeditationReason(entry.no_meditation_reason || '')
      }

      const { data: dIntent } = await supabase
        .from('daily_intents').select('*').eq('user_id', user.id).eq('entry_date', today).maybeSingle()
      if (dIntent && mounted) {
        setIntent(dIntent.intent || '')
        setIdea(dIntent.idea || '')
      }

      const { data: dSteps } = await supabase
        .from('action_steps')
        .select('*')
        .eq('user_id', user.id).eq('entry_date', today)
        .order('step_order', { ascending: true })

      if (mounted && dSteps?.length) {
        setSteps(dSteps.map(s => ({
          id: s.id, step_order: s.step_order, label: s.label, url: s.url, completed: s.completed
        })))
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

  const greeting = useMemo(() => `✨ Hey ${fullName}, let’s set up today in under a minute.`, [fullName])

  const stepKeys = useMemo(() => {
    const base = ['mood','med','maybeReason','intent','idea','plan']
    return didMeditation === false ? base : base.filter(s => s !== 'maybeReason')
  }, [didMedititation, didMeditation])
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
        body: JSON.stringify({ focus: intent, detail: idea }) // pass richer names if your API expects them
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

  // single‑step actions
  async function completeCurrentStep() {
    const cur = steps.find(s => !s.completed)
    if (!cur) return
    await supabase
      .from('action_steps')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('user_id', user.id).eq('entry_date', today).eq('step_order', cur.step_order)

    setSteps(prev => prev.map(s => s.step_order === cur.step_order ? { ...s, completed: true } : s))

    // if all done, you can call onDone or keep them on plan
    const stillOpen = steps.some(s => !s.completed && s.step_order !== cur.step_order)
    if (!stillOpen && typeof onDone === 'function') onDone()
  }

  function shrinkLabel(label='') {
    if (!label) return 'Do the first 5‑minute slice.'
    if (label.length <= 60) return `Timebox 5 min: ${label}`
    return `Do a 5‑minute slice of: ${label.slice(0, 72)}…`
  }
  function markStuck() {
    // Don’t touch DB — just shrink the current step label so it feels actionable now.
    const cur = steps.find(s => !s.completed)
    if (!cur) return
    setSteps(prev => prev.map(s => s.step_order === cur.step_order ? { ...s, label: shrinkLabel(s.label) } : s))
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
              placeholder="e.g., Financial freedom"
              style={{ width:'100%', border:'2px solid #000', borderRadius:8, padding:'10px 12px', fontSize:14, background:'#fff', color:'#000' }}
            />
          </Field>
        </>
      )}

      {key === 'idea' && (
        <>
          <div style={{fontSize:18, fontWeight:900, marginBottom:6}}>Great—now add a bit more clarity so we hit the target.</div>
          <Field>
            <input
              value={idea}
              onChange={e=>setIdea(e.target.value)}
              placeholder="e.g., Make $100 on Etsy"
              style={{ width:'100%', border:'2px solid #000', borderRadius:8, padding:'10px 12px', fontSize:14, background:'#fff', color:'#000' }}
            />
          </Field>
          <Field>
            <Button onClick={async ()=>{ await generatePlan(); setIdx(stepKeys.indexOf('plan')) }} disabled={generating || !intent.trim()}>
              {generating ? 'Summoning plan…' : 'Continue'}
            </Button>
          </Field>
        </>
      )}

      {key === 'plan' && (
        <>
          {/* If no steps yet (e.g., refresh), allow loading */}
          {steps.length === 0 && (
            <Field>
              <Button onClick={()=>generatePlan()} disabled={generating}>
                {generating ? 'Summoning plan…' : 'Load today’s steps'}
              </Button>
            </Field>
          )}

          {steps.length > 0 && (() => {
            const completedCount = steps.filter(s => s.completed).length
            const cur = steps.find(s => !s.completed) || steps[steps.length-1]
            const ord = ordinalWord(completedCount + 1)

            return (
              <div style={{marginTop:6}}>
                <div style={{fontSize:14, opacity:.8, marginBottom:6}}>
                  Focus: <strong>{intent || '—'}</strong>{idea ? ` — “${idea}”` : ''}
                </div>

                <div style={{fontSize:18, fontWeight:900, margin:'6px 0 12px'}}>
                  Alright {fullName}, do this <em style={{fontStyle:'normal', textDecoration:'underline'}}>{ord}</em> step now (≤15 min):
                </div>

                <div style={{
                  padding:'14px 16px',
                  border:'1px solid #222',
                  borderRadius:12,
                  background:'rgba(255,255,255,0.03)'
                }}>
                  <div style={{fontSize:16, fontWeight:800, lineHeight:1.5}}>
                    {cur.label}
                  </div>

                  {cur.url && (
                    <div style={{marginTop:10}}>
                      <a
                        href={cur.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontWeight:900, textDecoration:'underline', display:'inline-block' }}
                      >
                        🔥 Open this now ↗
                      </a>
                    </div>
                  )}

                  <div style={{display:'flex', gap:10, marginTop:12}}>
                    <Button onClick={completeCurrentStep}>I did it ✅</Button>
                    <Button variant="ghost" onClick={markStuck}>I’m stuck ⚡</Button>
                  </div>
                </div>

                <div style={{fontSize:13, color:'#444', marginTop:12}}>
                  Small wins compound. One brick at a time.
                </div>
              </div>
            )
          })()}
        </>
      )}

      {/* nav buttons (kept for non-plan steps) */}
      <div style={{marginTop:14, display:'flex', justifyContent:'space-between'}}>
        <Button variant="ghost" onClick={()=>{ if (idx>0) setIdx(idx-1) }} style={{minWidth:96}}>Back</Button>
        <Button onClick={doNext} disabled={!canNext || idx===total-1} style={{minWidth:96}}>Next</Button>
      </div>
    </div>
  )
}
