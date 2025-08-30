// src/genieBrain.js
// Manifestation Genie — stripped back to basics (single-bubble, no rituals/numerology/angel hints)

/**
 * Very small deterministic reply generator.
 * - No emojis (unless the user typed them).
 * - No multi-bubbles; just one concise message.
 * - No rituals, numerology, angel hints, witty comebacks, or roasts.
 * - Mirrors the user's intent and gives one concrete 5-minute next step.
 */

function sanitize(s=''){
  try {
    return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  } catch { return ''; }
}

/**
 * Build a single, minimal reply.
 * @param {Object} param0
 * @param {string} param0.input - latest user message
 * @param {Object} param0.user - { firstName?: string }
 * @returns {{ text: string, bubbles: string[] }}
 */
export async function genieReply({ input = '', user = {}, opts = {} } = {}) {
  const wish = sanitize(input);
  const name = (user && (user.firstName || user.name)) ? (user.firstName || user.name) : 'Friend';

  const header = wish ? `Focus: ${wish}` : `Focus: say what you want in one short sentence.`;

  // One universal micro-move that never gets in the way
  const step = [
    'First step: choose one tiny task that moves this forward.',
    'Set a 5-minute timer and start. Stop when it dings.',
    'Write the next tiny task for tomorrow.'
  ].join('\n');

  const body = [header, step].join('\n\n');

  return {
    text: body,
    bubbles: [body]
  };
}

export default { genieReply };
