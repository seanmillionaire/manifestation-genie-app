// pages/api/plan.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { intent = '', idea = '' } = req.body || {}

  // Normalize
  const i = (intent || '').toLowerCase()
  const d = (idea || '').toLowerCase()

  // Specialized plan: Fiverr UGC gigs
  if (d.includes('fiverr') || d.includes('ugc')) {
    return res.status(200).json({
      steps: [
        { label: 'Open Fiverr and log in', url: 'https://www.fiverr.com' },
        { label: 'Search 3 top UGC creators and note their offers in your Genie Journal' },
        { label: 'Draft your gig title + 3 bullet promises in a doc' },
        { label: 'Write your gig description (follow‑the‑leader: structure, FAQs, delivery time)' },
        { label: 'Upload 1 sample video (use your phone — 15s intro reel is enough)' },
        { label: 'Publish the gig (basic package live today)' },
        { label: 'Set a reminder for tomorrow to add 2 FAQs and a second sample clip' }
      ]
    })
  }

  // Generic single-intent micro-plan
  let steps = [
    { label: `Define one micro‑win aligned with “${intent || 'today’s goal'}.” (Write it in one sentence)` },
    { label: 'Identify 3 people/pages to model (search, screenshot their best elements)' },
    { label: 'Draft a 5‑bullet action outline (keep it under 15 minutes total work)' },
    { label: 'Execute now: ship the smallest publishable outcome' },
    { label: 'Log what you shipped + set a reminder for the next step tomorrow' }
  ]

  // If the idea exists but isn’t Fiverr/UGC, inject it
  if (d) steps.splice(1, 0, { label: `Anchor your idea: ${idea}` })

  return res.status(200).json({ steps })
}
