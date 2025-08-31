import { useSession } from '../src/state/sessionStore'
import { useRouter } from 'next/router'
export default function Wish(){
  const { set } = useSession(); const r = useRouter()
  let text = ''
  return (
    <div>
      <h1>Choose Your Quest</h1>
      <button onClick={()=>{ set({wishMode:'existing'}); r.push('/questionnaire') }}>Continue Last Wish</button>
      <div style={{marginTop:20}}>
        <input placeholder="Or type a new wish…" onChange={e=>text=e.target.value}/>
        <button onClick={()=>{ set({wishMode:'new', wishText:text}); r.push('/questionnaire') }}>Use This</button>
      </div>
    </div>
  )
}
