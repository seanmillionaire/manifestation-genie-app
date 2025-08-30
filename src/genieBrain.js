// src/genieBrain.js — minimal, single-bubble

function sanitize(s=''){
  try { return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 500); }
  catch { return ''; }
}

export async function genieReply({ input = '', user = {} } = {}) {
  const wish = sanitize(input);
  const header = wish
    ? `Focus: ${wish}`
    : `Focus: say what you want in one short sentence.`;

  const step = [
    'First step: choose one tiny task that moves this forward.',
    'Set a 5-minute timer and start. Stop when it dings.',
    'Write the next tiny task for tomorrow.'
  ].join('\n');

  const body = [header, step].join('\n\n');
  return { text: body, bubbles: [body] }; // single bubble only
}

export default { genieReply };
