// pages/onboard.js — Two-step wizard: Pledge → Quick Setup → /flow
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function Onboard(){
  const router = useRouter()
  const [step, setStep] = useState(1)     // 1 = pledge, 2 = quick setup
  const [agree, setAgree] = useState(false)
  const [q1, setQ1] = useState('')        // experience
  const [q2, setQ2] = useState('')        // tried
  const [q3, setQ3] = useState('')        // pain

  useEffect(() => {
    const accepted = localStorage.getItem('mg_pledge_ok')==='1'
    if (accepted) setStep(2) // if already pledged, jump to quick setup
  }, [])

  function nextFromPledge(){
    if (!agree) return
    localStorage.setItem('mg_pledge_ok','1')
    setStep(2)
  }

  function finishSetup(){
    // score for tier
    const score =
      (q1==='5+ years' ? 2 : q1==='1–5 years' ? 1 : 0) +
      (q2==='Tried everything' ? 2 : q2==='Tried a few' ? 1 : 0)
    const tier = score >= 3 ? 'advanced' : 'beginner'
    localStorage.setItem('mg_tier', tier)
    if (q3) localStorage.setItem('mg_pain_focus', q3)
    router.replace('/flow') // → your vibe select flow continues from here
  }

  return (
    <main style={{minHeight:'100vh', background:'#fff', color:'#111'}}>
      <div style={{maxWidth:980, margin:'0 auto', padding:'24px 16px'}}>
        {/* STEP 1 — PLEDGE ONLY (header already shows logo; no duplicate images here) */}
        {step===1 && (
          <section style={{border:'1px solid #e5e7eb', borderRadius:16, padding:20, boxShadow:'0 12px 40px rgba(15,23,42,.08)'}}>
            <h1 style={{margin:'0 0 8px'}}>This isn’t another LOA app.</h1>
            <p style={{margin:'0 0 8px', color:'#475569'}}>
              It’s the place where <b>healing replaces hustle</b>. No toxic positivity. No blame. One track at a time, we work with reality — not against it.
            </p>
            <label style={{display:'flex', gap:10, alignItems:'flex-start', marginTop:10}}>
              <input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)} />
              <span>I promise to use the Genie for good, never for harm; to honor my humanity; and to choose compassion over force.</span>
            </label>

            <div style={{marginTop:14, display:'flex', gap:10}}>
              <button className="btn btn-primary" disabled={!agree} onClick={nextFromPledge}>Continue</button>
            </div>
          </section>
        )}

        {/* STEP 2 — QUICK SETUP */}
        {step===2 && (
          <section style={{border:'1px solid #e5e7eb', borderRadius:16, padding:20, boxShadow:'0 12px 40px rgba(15,23,42,.08)'}}>
            <h2 style={{margin:'0 0 10px'}}>Quick Setup (30 seconds)</h2>

            <div style={{marginTop:10}}>
              <div style={{fontWeight:700, marginBottom:6}}>Experience with LOA?</div>
              <div style={{display:'flex', flexWrap:'wrap', gap:10}}>
                {['New / curious','1–5 years','5+ years'].map(opt=>(
                  <button key={opt}
                    className={q1===opt?'btn btn-primary':'btn btn-ghost'}
                    onClick={()=>setQ1(opt)}
                  >{opt}</button>
                ))}
              </div>
            </div>

            <div style={{marginTop:14}}>
              <div style={{fontWeight:700, marginBottom:6}}>Tried so far?</div>
              <div style={{display:'flex', flexWrap:'wrap', gap:10}}>
                {['Barely anything','Tried a few','Tried everything'].map(opt=>(
                  <button key={opt}
                    className={q2===opt?'btn btn-primary':'btn btn-ghost'}
                    onClick={()=>setQ2(opt)}
                  >{opt}</button>
                ))}
              </div>
            </div>

            <div style={{marginTop:14}}>
              <div style={{fontWeight:700, marginBottom:6}}>What hurts most right now?</div>
              <div style={{display:'flex', flexWrap:'wrap', gap:10}}>
                {['Money stress','Relationship loop','Health / grief','Mental exhaustion'].map(opt=>(
                  <button key={opt}
                    className={q3===opt?'btn btn-primary':'btn btn-ghost'}
                    onClick={()=>setQ3(opt)}
                  >{opt}</button>
                ))}
              </div>
            </div>

            <div style={{marginTop:16, display:'flex', gap:10}}>
              <button className="btn btn-ghost" onClick={()=>setStep(1)}>Back</button>
              <button className="btn btn-primary" disabled={!q1 || !q2} onClick={finishSetup}>Enter the Genie</button>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
