export const GENIES = {
  genie1: {
    name: 'Mentor of Light',
    style: 'cinematic-ritual', // sensory, sacred, soothing authority
    openers: [
      "The lamp hums... your portal is open.", 
      "Step through, {firstName}. The path glows beneath you."
    ],
    narrate: (line:string)=> `✨ ${line}`
  },
  genie2: {
    name: 'Trickster Coach',
    style: 'gamified-quest',  // playful, bold, challenge framing
    openers: [
      "Quest accepted. Grab your gear.",
      "Today’s boss won’t beat itself. Ready?"
    ],
    narrate: (line:string)=> `⚔️ ${line}`
  }
}
