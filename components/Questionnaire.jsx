// pages/chat.js
import Questionnaire from '../components/Questionnaire'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'

const todayStr = () => new Date().toISOString().slice(0,10)
const HM_STORE_URL = 'https://hypnoticmeditations.ai'
const PAYHIP_URL = 'https://hypnoticmeditations.ai/b/U7Z5m'

export default function Chat() {
  const [session, setSession] = useState(null)
  const [allowed, setAllowed] = useState(null)
  const [messages, setMessages] = useState([])
  const [showQuestionnaire, setShowQuestionnaire] = useState(true)

  const listRef = useRef(null)
  const inputRef = useRef(null)

  // --- auth session ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!session) return <div className="p-6 text-white">Please log in</div>

  if (showQuestionnaire) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <h1 className="text-3xl font-extrabold mb-6 text-center">
          Start Today’s Manifestation
        </h1>

        <div className="bg-gray-900/70 p-6 rounded-xl shadow-lg w-full max-w-lg text-center">
          <p className="text-lg font-medium mb-4">
            Hey {session.user.user_metadata?.full_name || "Friend"} 👋 … quick check-in.  
            How’s your vibe today?
          </p>
          <div className="flex justify-center space-x-4">
            <button 
              className="px-6 py-3 rounded-lg font-semibold text-white bg-green-500 hover:bg-green-600"
              onClick={() => setShowQuestionnaire(false)}
            >😊 Good</button>
            <button 
              className="px-6 py-3 rounded-lg font-semibold text-white bg-yellow-500 hover:bg-yellow-600"
              onClick={() => setShowQuestionnaire(false)}
            >😌 Okay</button>
            <button 
              className="px-6 py-3 rounded-lg font-semibold text-white bg-red-500 hover:bg-red-600"
              onClick={() => setShowQuestionnaire(false)}
            >😔 Low</button>
          </div>
        </div>

        <p className="mt-6 text-sm text-gray-400">
          🔥 108 people used Manifestation Genie today
        </p>

        <button 
          className="mt-8 text-sm text-gray-400 underline"
          onClick={() => supabase.auth.signOut()}
        >
          Logout
        </button>
      </div>
    )
  }

  // --- chat interface (after questionnaire) ---
  return (
    <div className="min-h-screen bg-gray-100 text-black flex flex-col">
      <div className="flex-1 overflow-y-auto p-4" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`mb-2 ${m.role === "user" ? "text-right" : "text-left"}`}>
            <span className={`inline-block px-4 py-2 rounded-lg ${
              m.role === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-black"
            }`}>
              {m.content}
            </span>
          </div>
        ))}
      </div>
      <form 
        className="p-4 bg-white border-t flex"
        onSubmit={(e) => {
          e.preventDefault()
          const input = inputRef.current.value.trim()
          if (!input) return
          setMessages([...messages, { role: "user", content: input }])
          inputRef.current.value = ""
        }}
      >
        <input ref={inputRef} className="flex-1 border px-3 py-2 rounded-lg mr-2" placeholder="Type your message..." />
        <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">Send</button>
      </form>
    </div>
  )
}
