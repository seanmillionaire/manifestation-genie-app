// pages/api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages } = req.body; // [{role:'user'|'assistant'|'system', content:'...'}]

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages || [{ role: 'user', content: 'Say hello' }],
        temperature: 0.7
      })
    });

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || 'Sorry, no response.';
    return res.status(200).json({ reply: text });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
