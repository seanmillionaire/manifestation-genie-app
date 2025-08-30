// pages/api/chat.js
// Server-side fallback Genie reply using the shared GenieBrain
import { genieReply } from '../../src/genieBrain'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }
    const { messages = [], userName = null, context = {} } = req.body || {}
    const last = Array.isArray(messages) && messages.length ? (messages[messages.length - 1].content || '') : (req.body?.input || '')
    const user = { firstName: userName || context?.firstName || 'Friend' }

    // Build the ritualized reply (no external API)
    const pack = await genieReply({ input: String(last || '').slice(0, 1000), user, opts: {} })
    const { bubbles = [], text = '' } = pack || {}
    const joined = text || (Array.isArray(bubbles) ? bubbles.join('\n\n') : '')

    return res.status(200).json({
      ok: true,
      bubbles,
      text: joined,
      reply: joined
    })
  } catch (err) {
    console.error('api/chat error', err)
    return res.status(200).json({ ok: true, text: 'The lamp flickered. Try again with one clear wish.' })
  }
}
