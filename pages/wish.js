import React, { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useSession } from '../src/state/sessionStore'

export default function Wish(){
  const r = useRouter()
  const { set, wishText } = useSession()
  const [text, setText] = useState(wishText || '')

  const goExisting = () => {
    if (!wishText) return alert('No previous wish stored. Type a new wish below.')
    set({ wishMode:'existing' })
    r.push('/questionnaire')
  }
  const goNew = () => {
    if (!text.trim()) return alert('Type a clear wish to continue.')
    set({ wishMode:'new', wishText:text.trim() })
    r.push('/questionnaire')
  }

  return (
    <>
      <Head><title>Choose Your Quest</title></Head>
      <main style={S.wrap}>
        <div style={S.card}>
          <h1 style={S.h1}>Choose Your Quest</h1>
          <div style={{display:'grid', gap:12}}>
            <button style={S.btn} onClick={goExisting} disabled={!wishText}>
              Continue Last Wish {wishText ? `“${wishText}”` : '(none yet)'}
            </button>
            <div style={{display:'grid', gap:8}}>
              <input style={S.input} placeholder="Or type a brand-new wish…" value={text} onChange={e=>setText(e.target.value)}/>
              <button style={S.btnDark} onClick={goNew}>Use This</button>
            </div>
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
  btn:{background:'#e5e7eb', border:'1px solid #d1d5db', borderRadius:10, padding:'12px 16px', fontWeight:700, cursor:'pointer', textAlign:'left'},
  btnDark:{background:'#111827', color:'#fff', border:'1px solid #222', borderRadius:10, padding:'12px 16px', fontWeight:700, cursor:'pointer'},
  input:{padding:'12px 14px', borderRadius:10, border:'1px solid #d1d5db', outline:'none'}
}
