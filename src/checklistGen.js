// /src/checklistGen.js
// Returns 3 clear steps: clear space → tiny action → share/ship.
// Always returns [{ id, text, done }].

export function generateChecklist(input = {}) {
  const W = String(input.wish || '').trim();
  const B = String(input.block || '').trim();
  const M = String(input.micro || '').trim();

  const w = W.toLowerCase();
  const b = B.toLowerCase();

  const has = (s, keys) => !!s && keys.some(k => s.includes(k));

  // intent for step 3
  const intent =
    has(w, ['revenue','sales','sell','checkout','order','buy','customers','aov','payhip','shopify','product','offer']) ? 'sales' :
    has(w, ['video','short','reel','tiktok','yt','youtube','clip'])                                                   ? 'video' :
    has(w, ['email','newsletter','aweber','list','broadcast'])                                                         ? 'email' :
    has(w, ['ad','ads','meta','facebook','google','tiktok ads','campaign'])                                            ? 'ads' :
    has(w, ['landing','page','funnel','vsl','quiz','bridge','optin','thank you','preframe'])                           ? 'landing' :
    has(w, ['blog','seo','rank','article','post'])                                                                     ? 'seo' :
    has(w, ['post','tweet','x.com','thread','instagram','ig','story'])                                                 ? 'social' :
    has(w, ['meditation','audio','track','hypnosis','bundle'])                                                         ? 'product' :
    'generic';

  // STEP 1 — clear space (gentle, specific)
  let step1 = `Clear your space for "${W || 'your wish'}": turn on Do Not Disturb, close extra tabs, and tidy your desk (2 min).`;
  if (B) {
    if (has(b, ['overwhelm','busy','time']))       step1 = `Book 30 minutes for "${W || 'your wish'}". Turn on DND. One tab only.`;
    else if (has(b, ['fear','scared','doubt','confidence'])) step1 = `Take 2 deep breaths. Picture "${W || 'your wish'}" already done. Press start.`;
    else if (has(b, ['tech','setup','domain','pixel','tracking'])) step1 = `Open the tool for "${W || 'your wish'}". Fill one required field and Save.`;
    else if (has(b, ['money','budget','cost']))    step1 = `Pick a $0 option to move "${W || 'your wish'}" forward. Ship first, upgrade later.`;
    else if (has(b, ['perfection','perfect','procrast'])) step1 = `Do an ugly first draft for "${W || 'your wish'}" (15 min). Done > perfect.`;
  }

  // STEP 2 — tiny action (timer)
  const step2 = M
    ? `Start a 15-minute timer and do: "${M}". Just begin.`
    : `Choose the smallest action toward "${W || 'your wish'}". Start a 15-minute timer and begin.`;

  // STEP 3 — share/ship (intent-specific)
  let step3 = `Tell one person or post one message about "${W || 'your wish'}" today.`;
  switch (intent) {
    case 'sales':   step3 = `Post one offer link for "${W}". Put your CTA in the first line.`; break;
    case 'video':   step3 = `Record one 30-45s clip about "${W}". Post it with a first-line CTA.`; break;
    case 'email':   step3 = `Send one 5-sentence email about "${W}" with one CTA link.`; break;
    case 'ads':     step3 = `Launch a single ad set for "${W}": 1 audience, 1 creative. Turn it on.`; break;
    case 'landing': step3 = `Publish a simple page for "${W}": hero headline + one gold CTA. Go live.`; break;
    case 'seo':     step3 = `Publish a short outline for "${W}" (H1/H2 + ~200 words).`; break;
    case 'social':  step3 = `Post one update about "${W}". Put the CTA in line 1.`; break;
    case 'product': step3 = `Update your product page for "${W}": 3 bullets, hero image, buy link. Publish.`; break;
  }

  const steps = [
    { id: 's1', text: step1, done: false },
    { id: 's2', text: step2, done: false },
    { id: 's3', text: step3, done: false },
  ];

  // final guard to ensure structure
  return steps.filter(s => s && typeof s.text === 'string').slice(0, 3);
}
