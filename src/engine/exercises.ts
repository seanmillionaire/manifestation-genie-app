export type Vibe = 'calm' | 'confident' | 'playful';
export type Persona = 'genie1' | 'genie2';

export type InputCtx = {
  desire: string;          // the user's goal / wish
  blocker?: string | null; // optional blocker
  asset: string;           // stable per-user string (user id/email) to rotate/day-lock
};

export type Exercise = {
  id: string;
  title: string;
  minutes: number;
  vibe: Vibe;
  persona: Persona;
  dayHint?: string; // e.g., "Day 1"
  script: string;   // what we show in chat
  checklist?: string[]; // optional bulleted steps
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function hashStr(s: string): number {
  // small, deterministic hash
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function headerFor(vibe: Vibe) {
  switch (vibe) {
    case 'confident': return '⚡';
    case 'playful': return '🎈';
    default: return '✨';
  }
}

function paragraph(s: string): string { return s.trim(); }

// ------------------ PACK BUILDER ------------------

/**
 * Builds a deterministic list of exercises. The first one is your “Numerology 1 → 2”
 * partnership exercise, customized to the user's desire.
 */
export function buildExercisePack(
  ctx: InputCtx,
  vibe: Vibe = 'calm',
  persona: Persona = 'genie1'
): Exercise[] {
  const icon = headerFor(vibe);
  const desireLine = ctx.desire ? `Your focus: ${ctx.desire}` : '';

  const ex1: Exercise = {
    id: 'day1-numerology-partnership',
    title: 'The “1 → 2” Partnership Boost',
    minutes: 3,
    vibe,
    persona,
    dayHint: 'Day 1',
    script: [
      `${icon} Exercise #1 — The “1 → 2” Partnership Boost`,
      desireLine ? `\n${desireLine}\n` : '',
      paragraph(`Quick idea: $1,000,000/mo reduces to **1** (independence). Add the ‘field effect’ of 0’s potential and you lean into **2** → partnerships & balance.`),
      '',
      paragraph(`In 3 minutes:`),
      `1) Write 2 names (people or brands) who could *double your speed* toward this goal.`,
      `2) Pick 1 tiny outreach you can do today (DM, email, intro ask, thoughtful comment).`,
      `3) Draft your opener line in one sentence.`,
      '',
      `Reply here with:`,
      `- Names: [Name A], [Name B]`,
      `- Outreach: [Your one-sentence opener]`,
      '',
      `When you post it here, type **done**.`
    ].join('\n')
  };

  // You can append future-day exercises here (examples stubbed for clarity).
  const ex2: Exercise = {
    id: 'day2-micro-commit',
    title: 'Micro-Commit Ladder',
    minutes: 4,
    vibe,
    persona,
    dayHint: 'Day 2',
    script: [
      `${icon} Exercise #2 — Micro-Commit Ladder`,
      desireLine ? `\n${desireLine}\n` : '',
      `List 3 micro-steps you can finish in < 10 minutes each.`,
      `Pick the smallest one and schedule it today. Reply with your pick and your exact start time.`
    ].join('\n')
  };

  const ex3: Exercise = {
    id: 'day3-belief-reframe',
    title: 'Belief Reframe (30-second swap)',
    minutes: 3,
    vibe,
    persona,
    dayHint: 'Day 3',
    script: [
      `${icon} Exercise #3 — Belief Reframe`,
      desireLine ? `\n${desireLine}\n` : '',
      `Write the limiting belief in 6 words.`,
      `Now flip it to a helpful belief in 6 words.`,
      `Reply with both lines (old → new).`
    ].join('\n')
  };

  return [ex1, ex2, ex3];
}

/**
 * Deterministically pick today's exercise so there is only ONE per day.
 * Uses (today + asset) to pick an index so users don’t all see the same day
 * unless you want them to (asset can be user id/email).
 */
export function pickToday(pack: Exercise[], asset: string = 'default'): Exercise {
  if (!pack.length) throw new Error('Empty pack');
  const idx = hashStr(`${todayKey()}::${asset}`) % pack.length;
  return pack[idx];
}

// Handy exports if the API wants to expose these
export const _util = { todayKey, hashStr };
