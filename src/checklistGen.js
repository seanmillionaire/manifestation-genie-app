// /src/checklistGen.js
// Generates a 3-step list that is CLEAR, ACTIONABLE, and ENCOURAGING.
// Tone = manifestor: simple language, tiny actions, momentum.

export function generateChecklist({ wish = '', block = '', micro = '' }) {
  const W = (wish || '').trim();
  const B = (block || '').trim();
  const M = (micro || '').trim();

  const w = W.toLowerCase();
  const b = B.toLowerCase();

  const has = (s, keys) => keys.some((k) => s.includes(k));

  // infer the intent of the wish to tailor step 3
  const intent =
    has(w, ['revenue', 'sales', 'sell', 'checkout', 'order', 'buy', 'customers', 'aov', 'payhip', 'shopify', 'product', 'offer']) ? 'sales' :
    has(w, ['video', 'short', 'reel', 'tiktok', 'yt', 'youtube', 'clip'])                                               ? 'video' :
    has(w, ['email', 'newsletter', 'aweber', 'list', 'broadcast'])                                                       ? 'email' :
    has(w, ['ad', 'ads', 'meta', 'facebook', 'google', 'tiktok ads', 'campaign'])                                        ? 'ads' :
    has(w, ['landing', 'page', 'funnel', 'vsl', 'quiz', 'bridge', 'optin', 'thank you', 'preframe'])                     ? 'landing' :
    has(w, ['blog', 'seo', 'rank', 'article', 'post'])                                                                   ? 'seo' :
    has(w, ['post', 'tweet', 'x.com', 'thread', 'instagram', 'ig', 'story'])                                             ? 'social' :
    has(w, ['meditation', 'audio', 'track', 'hypnosis', 'bundle'])                                                       ? 'product' :
    'generic';

  //
  // STEP 1 — CLEAR YOUR SPACE (simple, welcoming)
  //
  let step1 = `Clear your space for “${W || 'your wish'}”: turn on Do Not Disturb, close extra tabs, and tidy your desk (2 min).`;

  if (B) {
    // Friendly templates based on the type of resistance
    if (has(b, ['overwhelm', 'busy', 'time'])) {
      step1 = `Book 30 minutes for “${W || 'your wish'}”. Turn on DND. One tab only.`;
    } else if (has(b, ['fear', 'scared', 'doubt', 'confidence'])) {
      step1 = `Take 2 deep breaths. Picture “${W || 'your wish'}” already done. Press start.`;
    } else if (has(b, ['tech', 'setup', 'domain', 'pixel', 'tracking'])) {
      step1 = `Open the tool you need for “${W || 'your wish'}”. Fill one required field and click Save.`;
    } else if (has(b, ['money', 'budget', 'cost'])) {
      step1 = `Pick the $0 option to move “${W || 'your wish'}” forward. Ship first, upgrade later.`;
    } else if (has(b, ['perfection', 'perfect', 'procrast'])) {
      step1 = `Do an ugly first draft for “${W || 'your wish'}”. 15 minutes. Done > perfect.`;
    }
  }

  //
  // STEP 2 — TINY ACTION (timer, explicit instruction)
  //
  const step2 = M
    ? `Start a 15-minute timer and do: “${M}”. Just begin.`
    : `Choose the smallest action toward “${W || 'your wish'}”. Start a 15-minute timer and begin.`;

  //
  // STEP 3 — SHARE / SHIP (momentum + specific per intent)
  //
  let step3 = `Tell one person or post one message about “${W || 'your wish'}” today.`;

  switch (intent) {
    case 'sales':
      step3 = `Post one offer link for “${W}” (story/post/email). Put your CTA in the first line.`;
      break;
    case 'video':
      step3 = `Record one 30–45s clip about “${W}”. Post it with a first-line CTA.`;
      break;
    case 'email':
      step3 = `Send one 5-sentence email about “${W}” with one CTA link.`;
      break;
    case 'ads':
      step3 = `Launch a single ad set for “${W}”: 1 audience, 1 creative. Turn it on.`;
      break;
    case 'landing':
      step3 = `Publish a simple page for “${W}”: hero headline + one gold CTA. Go live.`;
      break;
    case 'seo':
      step3 = `Publish a short outline for “${W}” (H1/H2 + ~200 words).`;
      break;
    case 'social':
      step3 = `Post one update about “${W}”. Put the CTA in line 1.`;
      break;
    case 'product':
      step3 = `Update your product page for “${W}”: 3 bullets, hero image, buy link. Publish.`;
      break;
    // 'generic' keeps default
  }

  return [
    { id: 's1', text: step1, done: false },
    { id: 's2', text: step2, done: false },
    { id: 's3', text: step3, done: false },
  ];
}
