export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { intent = '', idea = '' } = req.body || {}

  const steps = [
    { label: `Open the tool you'll use (${idea || 'start with the simplest tool'})`, url: 'https://www.fiverr.com' },
    { label: `Do the first micro-action toward "${intent || 'your goal'}"` },
    { label: 'Commit the result in writing (notes, checklist, or draft)' },
  ]

  res.status(200).json({ steps })
}
