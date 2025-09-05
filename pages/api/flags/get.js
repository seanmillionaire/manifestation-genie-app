// /pages/api/flags/get.js
import { supabase } from "../../../src/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

    const key = req.query.key;
    if (!key) { res.status(400).json({ error: "Missing key" }); return; }

    const { data } = await supabase
      .from("user_flags")
      .select("key, value")
      .eq("user_id", user.id)
      .eq("key", key)
      .maybeSingle();

    res.status(200).json({ value: data?.value || null });
  } catch (e) {
    res.status(200).json({ value: null });
  }
}
