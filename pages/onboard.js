// pages/onboard.js — Anti-LOA Onboarding + Pledge + Sophistication Detector
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function Onboard(){
  const router = useRouter()
  const [agree, setAgree] = useState(false)
  const [q1, setQ1] = useState('') // experience
  const [q2, setQ2] = useState('') // tried techniques
  const [q3, setQ3] = useState('') // what hurts now

  useEffect(() => {
    const accepted = localStorage.getItem('mg_pledge_ok') === '1'
    if (accepted) router.replace('/flow')
  }, [])

  function handleStart(){
    if (!agree) return
    // very simple sophistication score
    const score =
      (q1 === '5+ years' ? 2 : q1 === '1–5 years' ? 1 : 0) +
      (q2 === 'Tried everything' ? 2 : q2 === 'Tried a few' ? 1 : 0)

    const tier = score >= 3 ? 'advanced' : 'beginner'
    localStorage.setItem('mg_tier', tier)
    localStorage.setItem('mg_pain_focus', q3 || '')
    localStorage.setItem('mg_pledge_ok', '1')
    router.replace('/flow')
  }

  return (
    <main style={{minHeight:'100vh', background:'#fff', color:'#111'}}>
      <div style={{maxWidth:820, margin:'0 auto', padding:'32px 16px'}}>
        <div style={{textAlign:'center', marginBottom:22}}>
          <img src="/logo.png" alt="Manifestation Genie" style={{height:40}} />
        </div>

        <section style={{
          border:'1px solid #e5e7eb', borderRadius:16, padding:20,
          boxShadow:'0 12px 40px rgba(15,23,42,.08)', marginBottom:18
        }}>
          <h1 style={{margin:'0 0 8px'}}>This isn’t another LOA app.</h1>
          <p style={{margin:'0 0 8px', color:'#475569'}}>
            It’s the place where <b>healing replaces hustle</b>. No toxic positivity. No blame.
            One track at a time, we work with reality — not against it.
          </p>
          <label style={{display:'flex', gap:8, alignItems:'flex-start', marginTop:8}}>
            <input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)} />
            <span>
              I promise to use the Genie for good, never for harm; to honor my humanity; and to choose compassion over force.
            </span>
          </label>
        </section>

        <section style={{
          border:'1px solid #e5e7eb', borderRadius:16, padding:20,
          boxShadow:'0 12px 40px rgba(15,23,42,.08)'
        }}>
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

          <div style={{marginTop:16}}>
            <button
              className="btn btn-primary"
              disabled={!agree || !q1 || !q2}
              onClick={handleStart}
            >
              Enter the Genie
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
