import { supabase } from "./supabaseClient";

export async function logDailyVisit(userId?: string) {
  if (!userId) return;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  await supabase
    .from("user_daily_visits")
    .upsert({ user_id: userId, visit_date: today }, { onConflict: "user_id,visit_date", ignoreDuplicates: true });
}
