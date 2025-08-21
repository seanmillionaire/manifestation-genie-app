// components/Questionnaire.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../src/supabaseClient'

export default function Questionnaire({ user }) {
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(null)
  const [queue, setQueue] = useState([])

  useEffect(() => {
    loadSteps()
  }, [])

  async function loadSteps() {
    setLoading(true)
    const { data, error } = await supabase
      .from('action_steps')
      .select('*')
      .eq('user_id', user.id)
      .order('step_order', { ascending: true })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    // current = first incomplete
    const now = data.find(s => !s.completed)
    const rest = data.filter(s => !s.completed && s.id !== now?.id)

    setCurrentStep(now || null)
    setQueue(rest.slice(0, 2)) // only show next 2
    setLoading(false)
  }

  async function markDone() {
    if (!currentStep) return
    await supabase
      .from('action_steps')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', currentStep.id)

    await loadSteps()
  }

  async function markStuck() {
    // shrink step: mark it as skipped & re-ask server for a smaller step
    if (!currentStep) return
    await supabase
      .from('action_steps')
      .update({ completed: false, skipped: true })
      .eq('id', currentStep.id)

    // Here you’d normally hit your API to fetch a “smaller” replacement step
    await loadSteps()
  }

  if (loading) return <div>Loading Genie Flow...</div>

  if (!currentStep) {
    return (
      <div style={{ padding: 20 }}>
        <h2>✨ You’ve completed today’s steps!</h2>
        <p>Check back tomorrow for fresh guidance.</p>
      </div>
    )
  }

  return (
    <div style={{
      padding: 24,
      border: '1px solid #222',
      borderRadius: 12,
      background: 'rgba(255,255,255,0.03)',
      maxWidth: 600,
      margin: '0 auto'
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
        Focus for today
      </div>

      <h3 style={{ margin: '8px 0 12px', fontSize: 20, fontWeight: 800 }}>
        {currentStep.label}
      </h3>

      {currentStep.url && (
        <p>
          <a href={currentStep.url} target="_blank" rel="noreferrer" style={{ color: '#FFD600', fontWeight: 600 }}>
            Open Tool ↗
          </a>
        </p>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button
          onClick={markDone}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            background: '#FFD600',
            color: '#111',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          I did it ✅
        </button>

        <button
          onClick={markStuck}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            background: 'transparent',
            border: '1px solid #555',
            color: '#aaa',
            cursor: 'pointer'
          }}
        >
          I’m stuck ⚡
        </button>
      </div>

      {queue.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <div style={{ fontSize: 13, color: '#999', marginBottom: 6 }}>Up Next</div>
          <ul style={{ paddingLeft: 20 }}>
            {queue.map((s, i) => (
              <li key={s.id} style={{ fontSize: 15, marginBottom: 4 }}>{s.label}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
