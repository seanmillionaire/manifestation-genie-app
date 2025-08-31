import { supabase } from '../supabaseClient'
export async function upsertDailySession(userId:string, state:any){
  const payload = {
    user_id: userId,
    session_date: new Date().toISOString().slice(0,10),
    vibe: state.vibe, genie: state.genie,
    wish_id: state.wishId || null,
    wish_text: state.wishText || null,
    inputs: state.inputs,
    checklist: state.checklist,
    exercise: state.assignedExercise,
    progress: state.progress,
    win: state.win
  }
  const { data, error } = await supabase.from('daily_sessions')
    .upsert(payload,{ onConflict:'user_id,session_date' })
    .select().single()
  if (error) throw error
  return data
}
