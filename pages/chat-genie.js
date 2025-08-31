// /pages/chat-genie.js
import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import { get } from '../src/flowState'

function getFirstNameCached() {
  if (typeof window === 'undefined') return get().firstName || 'Friend'
  return get().firstName || localStorage.getItem('mg_first_name') || 'Friend'
}

export default function ChatGenie() {
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [name, setName] = useState(getFirstNameCached())
  const listRef = useRef(null)

  useEffect(() => { listRef.current?.scrollTo(0, 1e9) }, [msgs, thinking])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (!name || name === 'Friend' || /[0-9_]/.test(name)) {
          const m = await import('../src/userName')
          await m.hydrateFirstNameFromSupabase()
        }
      } catch {}
      if (alive) setName(getFirstNameCached())
    })()
    const onStorage = e => { if (e.key === 'mg_first_name') setName(e.newValue || 'Friend') }
    if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
    return () => {
      alive = false
      if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
    }
  }, [])
