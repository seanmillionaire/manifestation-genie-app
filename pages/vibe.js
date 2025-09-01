import React from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useSession } from '../src/state/sessionStore'

export default function Vibe(){
  const r = useRouter()
  const { set } = useSession()

  const pick = (v, g) => {
    set({ vibe:v, genie:g })
    r.push('/wish')
  }

  return (
    <>
      <Head><title>Pick Today’s Energy</title></Head>
      <main style={S.wrap}>
        <div style={S.card}>
          <h1 style={S.h1}>Pick Today’s Energy</h1>
          <p style={S.sub}>Choose your power mode and guide.</p>
          <div style={S.grid}>
            <button style={S.btn} onClick={()=>pick('bold','genie2')}>🔥 Bold • Trickster Coach</button>
            <button style={S.btn} onClick={()=>pick('calm','genie1')}>🙏 Calm • Mentor of Light</button>
            <button style={S.btn} onClick={()=>pick('rich','genie1')}>💰 Rich • Mentor of Light</button>
          </div>
        </div>
      </main>
    </>
  )
}

const S = {
  wrap:{minHeight:'100vh', display:'grid', placeItems:'center', background:'#0f172a'},
  card:{width:'100%', maxWidth:720, background:'#fff', borderRadius:16, boxShadow:'0 16px 40px rgba(0,0,0,.15)', padding:24},
  h1:{margin:0, fontSize:26},
  sub:{margin:'8px 0 16px', color:'#475569'},
  grid:{display:'grid', gap:12},
  btn:{background:'#111827', color:'#fff', padding:'12px 16px', borderRadius:10, border:'1px solid #222', cursor:'pointer', textAlign:'left', fontWeight:700}
}
