import { create } from 'zustand'

export const useSession = create((set, get) => ({
  firstName: '',
  vibe: null,                 // 'bold' | 'calm' | 'rich'
  genie: 'genie1',            // 'genie1' | 'genie2'
  wishMode: 'existing',       // 'existing' | 'new'
  wishId: null,
  wishText: '',
  inputs: { desire:'', blocker:'', asset:'' }, // questionnaire 3
  checklist: { distractions:false, headphones:false, breaths:false, readyAt:null },
  assignedExercise: null,     // { id, type, steps[], affirmations[], timers[] }
  progress: { stepIndex:0, completed:false },
  win: null,                  // { summary, timestamp }
  // setters
  set: (patch) => set(patch),
  resetForNewDay: () => set({
    vibe:null, wishMode:'existing', inputs:{desire:'',blocker:'',asset:''},
    checklist:{distractions:false,headphones:false,breaths:false,readyAt:null},
    assignedExercise:null, progress:{stepIndex:0,completed:false}, win:null
  })
}))
// simple persistence
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('mg_session');
  if (saved) useSession.setState(JSON.parse(saved))
  useSession.subscribe((s)=> localStorage.setItem('mg_session', JSON.stringify(s)))
}
