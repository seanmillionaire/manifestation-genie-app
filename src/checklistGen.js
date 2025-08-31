// /src/checklistGen.js
export function generateChecklist({ wish='', block='', micro='' }) {
  const W = (wish || '').trim();
  const B = (block || '').trim();
  const M = (micro || '').trim();
  const w = W.toLowerCase();
  const b = B.toLowerCase();

  const has = (s, keys) => keys.some(k => s.includes(k));
  const intent =
    has(w, ['revenue','sales','sell','checkout','order','buy','customers','aov','payhip','shopify','product','offer']) ? 'sales' :
    has(w, ['video','short','reel','tiktok','yt','youtube','clip'])                                             ? 'video' :
    has(w, ['email','newsletter','aweber','list','broadcast'])                                                   ? 'email' :
    has(w, ['ad','ads','meta','facebook','google','tiktok ads','campaign'])                                      ? 'ads' :
    has(w, ['landing','page','funnel','vsl','quiz','bridge','optin','thank you','preframe'])                     ? 'landing' :
    has(w, ['blog','seo','rank','article','post'])                                                               ? 'seo' :
    has(w, ['post','tweet','x.com','thread','instagram','ig','story'])                                           ? 'social' :
    has(w, ['meditation','audio','track','hypnosis','bundle'])                                                   ? 'product' :
    'generic';

  let step1 = B
    ? `Neutralize the block “${B}”. Set a 30-minute focus window and remove one friction (phone off / tab close / clear desk).`
    : `Set a 30-minute focus window. Phone on DND. One tab only.`;

  if (has(b, ['overwhelm','busy','time']))      step1 = `Calendar 30 minutes for "${W}". Phone on DND. One tab only.`;
  if (has(b, ['fear','scared','doubt','confidence'])) step1 = `2-minute pre-game: breathe, visualize "${W}" done, press go.`;
  if (has(b, ['tech','setup','domain','pixel','tracking'])) step1 = `Open the tool you need for "${W}". Complete one required field. Save once.`;
  if (has(b, ['money','budget','cost']))        step1 = `Pick the $0 version to advance "${W}". Ship first, upgrade later.`;
  if (has(b, ['perfection','perfect','procrast'])) step1 = `Draft ugly first for "${W}". 15-minute limit. Done > perfect.`;

  const step2 = M ? `Do your micro-move now: "${M}". Start timer (15m).` : `Choose the smallest action toward “${W}” and do it now (15m).`;

  let step3 = `Publish proof of progress for “${W}” (one message, one person, one platform).`;
  switch (intent) {
    case 'sales':   step3 = `Publish one offer link for “${W}” (story/post/email). First line = CTA.`; break;
    case 'video':   step3 = `Record one 30–45s clip about “${W}”. Upload with first-line CTA.`; break;
    case 'email':   step3 = `Send one 5-sentence email about “${W}” with a single CTA link.`; break;
    case 'ads':     step3 = `Launch 1 ad set for “${W}”: 1 audience, 1 creative. Turn it on.`; break;
    case 'landing': step3 = `Ship the page for “${W}”: add hero headline + one gold CTA. Go live.`; break;
    case 'seo':     step3 = `Publish an outline post for “${W}” (H1/H2 + 200 words). Link it in nav.`; break;
    case 'social':  step3 = `Post one social update about “${W}” with a hard CTA in line 1.`; break;
    case 'product': step3 = `Update the product page for “${W}”: 3 bullets + hero image + buy link. Publish.`; break;
  }

  return [
    { id: 's1', text: step1, done: false },
    { id: 's2', text: step2, done: false },
    { id: 's3', text: step3, done: false },
  ];
}
