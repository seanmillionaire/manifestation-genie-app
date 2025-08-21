// pages/api/plan.js — Personalized 3-step plan (category-aware + strict JSON)
// Requires OPENAI_API_KEY in your env. Falls back to deterministic templates if the model is vague.

import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    focus = '',           // "Financial freedom" | "Better health" | "Loving relationships" | "Spiritual connection" | "Other"
    detail = '',          // user's clarified target text
    mood = null,          // 'good' | 'okay' | 'low'
    didMeditation = null, // boolean
    name = 'Friend'
  } = req.body || {}

  // --- Heuristic helpers for stronger personalization ---
  const guessUrl = (txt='') => {
    const t = txt.toLowerCase()
    if (t.includes('fiverr')) return 'https://www.fiverr.com'
    if (t.includes('upwork')) return 'https://www.upwork.com'
    if (t.includes('etsy')) return 'https://www.etsy.com'
    if (t.includes('shopify')) return 'https://www.shopify.com'
    if (t.includes('gumroad')) return 'https://gumroad.com'
    if (t.includes('craigslist')) return 'https://www.craigslist.org'
    if (t.includes('facebook') && t.includes('market')) return 'https://www.facebook.com/marketplace/'
    if (t.includes('youtube')) return 'https://studio.youtube.com'
    if (t.includes('instagram') || t.includes('ig')) return 'https://www.instagram.com'
    if (t.includes('tiktok')) return 'https://www.tiktok.com'
    if (t.includes('journal')) return 'https://docs.new'
    return null
  }

  const fallbackTemplates = (focusKey, detailText) => {
    const d = detailText || ''
    const url = guessUrl(d)
    switch ((focusKey || '').toLowerCase()) {
      case 'financial freedom':
        return [
          { label: `Pick one revenue move that fits “${d || 'today'}” and open the tool you’ll use`, url: url || null },
          { label: `Do one concrete action toward “${d || 'today’s cash goal'}” (e.g., publish 1 listing / pitch 5 leads / DM 3 prospects)`, url: null },
          { label: `Log what happened + schedule the next micro‑step (timebox 15–20 min)`, url: 'https://calendar.google.com' }
        ]
      case 'better health':
        return [
          { label: `Prepare your health action for “${d || 'today'}” (water bottle, shoes, app open)`, url: null },
          { label: `Do the action now: ${d ? d : '20–30 min movement or track one meal'}`, url: null },
          { label: `Record it (notes or app), then stack a tiny follow‑up (set tomorrow’s cue)`, url: null }
        ]
      case 'loving relationships':
        return [
          { label: `Choose the person(s) for “${d || 'today’s connection'}”`, url: null },
          { label: `Send / say one tangible gesture (message, call, plan, appreciation) specific to “${d || 'them'}”`, url: null },
          { label: `Capture the response + set the next touchpoint`, url: null }
        ]
      case 'spiritual connection':
        return [
          { label: `Set your space for “${d || 'practice'}” (2‑minute prep)`, url: null },
          { label: `Do the practice: ${d ? d : '7–10 min breathwork / stillness / gratitude walk'}`, url: null },
          { label: `Write one sentence of insight and choose the next cue`, url: 'https://docs.new' }
        ]
      default:
        return [
          { label: `Open the exact workspace/tool for “${d || 'your task'}”`, url: url || null },
          { label: `Ship one visible unit toward “${d || 'the outcome'}” (define DONE in 20–30 min)`, url: null },
          { label: `Document the result + schedule the next unit`, url: 'https://calendar.google.com' }
        ]
    }
  }

  // Build rich context for the model
  const context = {
    name,
    focus,
    detail,
    mood,
    didMeditation
  }

  const system = [
    "You are Manifestation Genie, a practical coach. Produce a laser‑specific 3‑step plan.",
    "Every step MUST reference the user’s actual goal (category and detail).",
    "Steps must be concrete, measurable, and doable within 30–40 minutes total.",
    "Prefer verbs, counts, and timeboxes. Avoid generic fluff.",
    "If the goal is vague, propose a micro clarification step as Step 1, tailored to the user’s wording.",
    "Return strict JSON with exactly 3 steps: { steps: [{label, url|null}, ...] }."
  ].join(' ')

  const userMsg = [
    `User: ${JSON.stringify(context, null, 2)}`,
    "Return JSON only. Use a helpful link if an obvious tool is mentioned (Fiverr, YouTube Studio, etc.)."
  ].join('\n')

  let steps = null

  try {
    const resp = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMsg }
      ],
      temperature: 0.5
    })

    const raw = resp?.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw)
    const arr = Array.isArray(parsed?.steps) ? parsed.steps : []

    // Coerce & de-genericize
    steps = arr
      .map((s, i) => ({
        label: String(s?.label || '').trim(),
        url: s?.url ? String(s.url) : null
      }))
      .filter(s => s.label)

    // Ensure each step mentions focus/detail at least implicitly
    const keyText = (focus || '') + ' ' + (detail || '')
    const looksGeneric = (txt) => {
      const t = (txt || '').toLowerCase()
      return !t.includes((focus || '').toLowerCase()) && !t.includes((detail || '').toLowerCase())
    }
    if (steps.length !== 3 || steps.some(s => looksGeneric(s.label))) {
      steps = null // trigger fallback
    }
  } catch (e) {
    // swallow and fallback
  }

  if (!steps) {
    steps = fallbackTemplates(focus, detail)
  }

  // Final sanity: exactly 3
  steps = (steps || []).slice(0, 3).map((s, i) => ({
    label: s.label || `Step ${i+1}`,
    url: s.url || null
  }))

  res.status(200).json({ steps })
}
