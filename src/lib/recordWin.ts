import { supabase } from "./supabaseClient";

export async function recordWin(userId: string, title: string, points = 0, note?: string) {
  if (!userId) return;
  await supabase.from("wins").insert({ user_id: userId, title, points, note });
}
