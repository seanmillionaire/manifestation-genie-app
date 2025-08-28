// pages/index.js
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../src/supabaseClient'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      router.replace(session ? '/chat' : '/login')
    })()
  }, [router])
  return null
}
