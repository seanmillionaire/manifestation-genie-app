// pages/api/plan.js — Personalized 3‑step plan (strict JSON + smart fallback)
// Expects body: { focus, detail, mood, didMeditation, name }
// Returns: { steps: [{ label: string, url: string|null }, ...] }

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    focus = '',
    detail = '',
    mood = null,            // 'good' | 'okay' | 'low' (optional)
    didMeditation = null,   // true | false | null (optional)
    name = 'Friend'
  } = req.body || {}

  // ---------- Helpers ----------
  const guessUrl = (txt = '') => {
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
    if (t.includes('journal') || t.includes('notes')) return 'https://docs.new'
    if (t.includes('calendar')) return 'https://calendar.google.com'
    return null
  }

  const fallbackTemplates = (focusKey, detailText) => {
    const d = (detailText || '').trim()
    const url = guessUrl(d)
    switch ((focusKey || '').toLowerCase()) {
      case 'financial freedom':
        return [
          { label: `Open the exact money tool for “${d || 'today'}” (e.g., Etsy/Fiverr)`, url: url },
          { label: `Do 1 revenue action: ${d ? d : 'publish 1 listing / pitch 5 leads / DM 3 prospects'}`, url: null },
          { label: `Record result + schedule the next 15‑min money move`, url: 'https://calendar.google.com' }
        ]
      case 'better health':
        return [
          { label: `Prep your health action (fill bottle, shoes on, app open)`, url: null },
          { label: d ? `Do it now: ${d}` : `Do 20–30 min of movement or track one meal`, url: null },
          { label: `Log it (app/notes) + set tomorrow’s cue`, url: null }
        ]
      case 'loving relationships':
        return [
          { label: `Pick who to connect with for “${d || 'today’s connection'}”`, url: null },
          { label: `Send/say one meaningful message or plan (specific to “${d || 'them'}”)`, url: null },
          { label: `Note the response + plan the next touchpoint`, url: null }
        ]
      case 'spiritual connection':
        return [
          { label: `Set your space for “${d || 'practice'}” (2‑min setup)`, url: null },
          { label: d ? `Practice now: ${d}` : `Do 7–10 min breathwork / stillness / gratitude walk`, url: null },
          { label: `Write one insight + choose tomorrow’s cue`, url: 'https://docs.new' }
        ]
      default:
        return [
          { label: `Open the workspace for “${d || 'your task'}”`, url: url },
          { label: `Ship one visible unit toward “${d || 'the outcome'}” (≤20–30 min)`, url: null },
          { label: `Document result + schedule the next unit`, url: 'https://calendar.google.com' }
        ]
    }
  }

  // ---------- Model prompt ----------
  const system = [
    'You are Manifestation Genie, a practical coach.',
    'Create a laser‑specific 3‑step plan for TODAY only.',
    'Each step MUST reference the user’s goal (category and/or detail).',
    'Steps must be concrete, measurable, and doable within 30–40 minutes total.',
    'Use action verbs, numbers, and timeboxes. Avoid generic fluff.',
    'If the goal is vague, the first step may be a 5‑minute micro‑clarification.',
    'Return STRICT JSON as: {"steps":[{"label":string,"url":string|null},...]} with exactly 3 steps.'
  ].join(' ')

  const userMsg = {
    name,
    focus,
    detail,
    mood,
    didMeditation,
    note: 'If the detail suggests a known tool (Etsy, Fiverr, YouTube Studio, Instagram, etc.), include its URL on that step.'
  }

  // ---------- Call model ----------
  let steps = null
  try {
    const resp = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(userMsg, null, 2) }
      ]
    })

    const raw = resp?.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw)
    const arr = Array.isArray(parsed?.steps) ? parsed.steps : []

    // Coerce and validate
    const keyText = `${(focus || '').toLowerCase()} ${(detail || '').toLowerCase()}`
    const mentionsGoal = (txt) => {
      const t = (txt || '').toLowerCase()
      // allow mentioning either focus or detail
      return focus ? t.includes((focus || '').toLowerCase()) || t.includes((detail || '').toLowerCase()) : true
    }

    const clean = arr
      .map(s => ({ label: String(s?.label || '').trim(), url: s?.url ? String(s.url) : null }))
      .filter(s => s.label)

    if (clean.length === 3 && clean.every(s => mentionsGoal(s.label))) {
      steps = clean
    }
  } catch (e) {
    // swallow; we’ll fallback
  }

  // ---------- Fallback if model is vague or failed ----------
  if (!steps) {
    steps = fallbackTemplates(focus, detail)
  }

  // Final shape (exactly 3)
  steps = steps.slice(0, 3).map((s, i) => ({
    label: s.label || `Step ${i + 1}`,
    url: s.url || null
  }))

  res.status(200).json({ steps })
}
