// components/GenieFlow.jsx — One-step plan + full questionnaire with Finish (drop-in)
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
function Field({ children }) { return <div style={{ marginTop:10 }}>{children}</div> }

const todayStr = () => new Date().toISOString().slice(0,10)
const ordinalWord = (n) => (['first','second','third'][n-1] || 'next')

export default function GenieFlow({ session, onDone }) {
  const user = session?.user
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('Friend')
  const [today] = useState(() => todayStr())

  // questionnaire state
  const [mood, setMood] = useState(null)                      // 'sad'|'neutral'|'happy'
  const [didMeditation, setDidMeditation] = useState(null)    // true|false
  const [noMeditationReason, setNoMeditationReason] = useState('')
  const [intent, setIntent] = useState('')                    // focus/category
  const [idea, setIdea] = useState('')                        // clarified target
  const [steps, setSteps] = useState([])                      // [{step_order,label,url,completed}]
  const [generating, setGenerating] = useState(false)

  const [idx, setIdx] = useState(0)

  // load profile + today rows
  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!user) { setLoading(false); return }
      setLoading(true)

      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      if (mounted) setFullName((profile?.full_name || user.email?.split('@')[0] || 'Friend'))

      const { data: entry } = await supabase
        .from('daily_entries').select('*').eq('user_id', user.id).eq('entry_date', today).maybeSingle()
      if (entry && mounted) {
        setMood(entry.mood ?? null)
        setDidMeditation(typeof entry.did_meditation === 'boolean' ? entry.did_meditation : null)
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

  // db helpers
  async function upsertEntry(fields) {
    if (!user) return
    await supabase.from('daily_entries').upsert(
      { user_id:user.id, entry_date:today, ...fields },
      { onConflict:'user_id,entry_date' }
    )
  }
  async function upsertIntent(nextIntent, nextIdea) {
    if (!user) return
    await supabase.from('daily_intents').upsert(
      { user_id:user.id, entry_date:today, intent:nextIntent, idea:nextIdea },
      { onConflict:'user_id,entry_date' }
    )
  }

  const greeting = useMemo(() => `✨ Hey ${fullName}, let’s set up today in under a minute.`, [fullName])

  // flow map (includes finish so users can complete)
  const stepKeys = useMemo(() => {
    const base = ['mood','med','maybeReason','intent','idea','plan','finish']
    return didMeditation === false ? base : base.filter(s => s !== 'maybeReason')
  }, [didMeditation])
  const total = stepKeys.length
  const key = stepKeys[idx]

  // gating for Next button
  const canNext = useMemo(() => {
    if (key === 'mood') return !!mood
    if (key === 'med') return didMeditation === true || didMeditation === false
    if (key === 'maybeReason') return true
    if (key === 'intent') return !!intent.trim()
    if (key === 'idea') return true
    if (key === 'plan') return true        // allow proceeding to finish at any time
    if (key === 'finish') return true
    return false
  }, [key, mood, didMeditation, intent])

  async function doNext() {
    if (key === 'mood') await upsertEntry({ mood })
    if (key === 'med') await upsertEntry({
      did_meditation: didMeditation,
      no_meditation_reason: didMeditation ? null : (noMeditationReason || null)
    })
    if (key === 'maybeReason') await upsertEntry({ no_meditation_reason: noMeditationReason || null })
    if (key === 'intent' || key === 'idea') await upsertIntent(intent, idea)

    // auto-generate plan as we leave "idea"
    if (key === 'idea' && steps.length === 0 && intent.trim()) {
      await generatePlan()
    }
    if (idx < total - 1) setIdx(idx + 1)
  }
  function back() { if (idx > 0) setIdx(idx - 1) }

  async function generatePlan() {
    if (!user) return
    setGenerating(true)
    try {
      const r = await fetch('/api/plan', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        // server accepts focus/detail; we map intent→focus, idea→detail
        body: JSON.stringify({ focus: intent, detail: idea })
      })
      const json = await r.json()
      const planSteps = Array.isArray(json?.steps) ? json.steps : []

      await supabase.from('action_steps').delete().eq('user_id', user.id).eq('entry_date', today)
      const rows = planSteps.map((s, i) => ({
        user_id:user.id, entry_date:today, step_order:i+1, label:s.label, url:s.url || null, completed:false
      }))
      if (rows.length) await supabase.from('action_steps').insert(rows)
      setSteps(rows.map(r => ({ ...r })))
    } finally {
      setGenerating(false)
    }
  }

  // plan step helpers
  const completedCount = steps.filter(s => s.completed).length
  const currentStep = steps.find(s => !s.completed) || steps[0] || null

  async function completeCurrentStep() {
    if (!user || !currentStep) return
    await supabase.from('action_steps')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('user_id', user.id).eq('entry_date', today).eq('step_order', currentStep.step_order)
    setSteps(prev => prev.map(s => s.step_order === currentStep.step_order ? { ...s, completed:true } : s))
  }
  function markStuck() {
    if (!currentStep) return
    const shrink = (label='') =>
      label.length <= 60 ? `Timebox 5 min: ${label}` : `Do a 5‑min slice of: ${label.slice(0,72)}…`
    setSteps(prev => prev.map(s => s.step_order === currentStep.step_order ? { ...s, label: shrink(s.label) } : s))
  }

  if (loading) return <div>Loading Genie…</div>

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
          <div style={{fontSize:18, fontWeight:900, marginBottom:6}}>
            Great — now add just enough clarity so you’ll hit the target.
          </div>
          <Field>
            <input
              value={idea}
              onChange={e=>setIdea(e.target.value)}
              placeholder='e.g., "Make $100 on Etsy"'
              style={{ width:'100%', border:'2px solid #000', borderRadius:8, padding:'10px 12px', fontSize:14, background:'#fff', color:'#000' }}
            />
          </Field>
          <Field>
            <Button onClick={async()=>{ await generatePlan(); setIdx(stepKeys.indexOf('plan')) }} disabled={generating || !intent.trim()}>
              {generating ? 'Summoning plan…' : 'Continue'}
            </Button>
          </Field>
        </>
      )}

      {key === 'plan' && (
        <>
          {steps.length === 0 && (
            <Field>
              <Button onClick={()=>generatePlan()} disabled={generating}>
                {generating ? 'Summoning plan…' : 'Load today’s steps'}
              </Button>
            </Field>
          )}

          {steps.length > 0 && (
            <div style={{marginTop:6}}>
              <div style={{fontSize:14, opacity:.8, marginBottom:6}}>
                Focus: <strong>{intent || '—'}</strong>{idea ? ` — “${idea}”` : ''}
              </div>

              <div style={{fontSize:18, fontWeight:900, margin:'6px 0 12px'}}>
                Alright {fullName}, do this <em style={{fontStyle:'normal', textDecoration:'underline'}}>
                  {ordinalWord((steps.filter(s => s.completed).length) + 1)}
                </em> step now (≤15 min):
              </div>

              <div style={{padding:'14px 16px', border:'1px solid #222', borderRadius:12, background:'rgba(255,255,255,0.03)'}}>
                <div style={{fontSize:16, fontWeight:800, lineHeight:1.5}}>
                  {currentStep?.label}
                </div>

                {currentStep?.url && (
                  <div style={{marginTop:10}}>
                    <a
                      href={currentStep.url}
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
          )}
        </>
      )}

      {key === 'finish' && (
        <>
          <div style={{fontSize:18, fontWeight:900, marginBottom:6}}>✨ Nice work. One brick laid.</div>
          <div style={{opacity:.9, marginBottom:12}}>You can keep going in chat or come back later.</div>
          <Field>
            <Button onClick={onDone} style={{minWidth:180}}>Finish & Open Chat</Button>
          </Field>
        </>
      )}

      {/* nav controls */}
      <div style={{marginTop:14, display:'flex', justifyContent:'space-between'}}>
        <Button variant="ghost" onClick={back} style={{minWidth:96}} disabled={idx===0}>Back</Button>
        <Button onClick={doNext} disabled={!canNext || idx===total-1} style={{minWidth:120}}>
          {key === 'plan' ? 'Continue' : 'Next'}
        </Button>
      </div>
    </div>
  )
}
