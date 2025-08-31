type Inputs = { desire:string, blocker:string, asset:string }
type Exercise = { id:string, type:'visualization'|'affirmation'|'action'|'shadow'|'breath'|'micro-proof', 
  title:string, steps:string[], affirmations?:string[], timers?:number[] }

const T = { // small helpers
  s:(x:string)=> x.trim().replace(/\s+/g,' ')
}

export function buildExercisePack(i:Inputs, vibe:'bold'|'calm'|'rich', persona:'genie1'|'genie2'): Exercise[] {
  const idSuffix = `${persona}-${vibe}`
  const baseViz: Exercise = {
    id: `viz-portal-${idSuffix}`,
    type: 'visualization',
    title: `See It: ${i.desire}`,
    steps: [
      `Close eyes. Breathe in 4, hold 2, out 6 — repeat 3x.`,
      `Picture a treasure room. Your ${i.desire} is the brightest object in it.`,
      `The ${i.blocker} appears as a shadow. Aim your ${i.asset} like a beam and dissolve it.`,
      `Lock the vision by touching thumb & forefinger. Whisper: “Already mine.”`
    ],
    timers: [30, 45, 45, 15]
  }

  const baseAff: Exercise = {
    id: `aff-spell-${idSuffix}`,
    type:'affirmation',
    title:'Spellcast the Command',
    affirmations: [
      `I command ${i.desire} now.`,
      `${i.desire} flows because I wield ${i.asset}.`,
      `The pattern of ${i.blocker} is broken and gone.`,
      `Each breath multiplies my ${i.desire}.`
    ],
    steps:[
      `Speak each line out loud once slowly.`,
      `Pick the one that hits hardest. Repeat 9 times while tapping your chest.`
    ],
    timers:[20, 60]
  }

  const microProof: Exercise = {
    id:`act-proof-${idSuffix}`,
    type:'micro-proof',
    title:'One Move That Proves It',
    steps:[
      `Choose a 60-second action that a person who already has ${i.desire} would take.`,
      `Examples: send one message, publish one offer, prepare one aligned meal, text one loving note.`,
      `Do it now. Return and hit “Mark Win.”`
    ],
    timers:[60]
  }

  const shadowPop: Exercise = {
    id:`shadow-pop-${idSuffix}`,
    type:'shadow',
    title:'Name the Saboteur, Shrink It',
    steps:[
      `Write the saboteur’s one-line script about ${i.desire}.`,
      `Answer with your asset: “Because I have ${i.asset}, this script loses power.”`,
      `Reduce its volume from 10→1 in your mind. Snap when it hits 1.`
    ],
    timers:[30, 45, 10]
  }

  const breathPrime: Exercise = {
    id:`prime-breath-${idSuffix}`,
    type:'breath',
    title:'State Prime (3 rounds)',
    steps:[
      `In 4 / hold 4 / out 8 — 7 cycles. Visualize gold light filling chest.`,
      `On each exhale, release ${i.blocker}.`,
      `On last inhale, anchor ${i.desire} with a slight smile.`
    ],
    timers:[60, 60, 15]
  }

  return [baseViz, baseAff, microProof, shadowPop, breathPrime]
}

export function pickToday(exercises: Exercise[]): Exercise {
  // Simple rotation; can upgrade to weighted/random/no-repeat logic
  const idx = Math.floor((Date.now()/86400000) % exercises.length)
  return exercises[idx]
}
