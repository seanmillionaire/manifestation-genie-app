// components/Home/home.api.js
import { supabase } from "../../lib/supabaseClient";

// ---------- Shape we expect in "profiles" table ----------
// id: uuid (matches auth.user.id)
// first_name: text
// agreements: jsonb   (e.g. { manifestForGood: { accepted: true, version: 1, at: "2025-08-31T..." } })
// onboarding: jsonb   (e.g. { tipGuide: { step: 3, completedAt: "..." } })

export async function getMe() {
  // 1) get the logged-in user
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) throw userErr || new Error("No user session");

  const userId = userData.user.id;

  // 2) load their profile row
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, agreements, onboarding")
    .eq("id", userId)
    .single();

  if (error) throw error;

  // normalize → match what HomeScreen expects
  return {
    id: data.id,
    firstName: data.first_name || "friend",
    agreements: data.agreements || {},
    onboarding: data.onboarding || {},
  };
}

export async function acceptManifestForGood({ version }) {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) throw userErr || new Error("No user session");

  const userId = userData.user.id;

  // Pull current agreements so we don't wipe other keys
  const { data: current, error: selErr } = await supabase
    .from("profiles")
    .select("agreements")
    .eq("id", userId)
    .single();

  if (selErr) throw selErr;

  const nextAgreements = {
    ...(current?.agreements || {}),
    manifestForGood: {
      accepted: true,
      version,
      at: new Date().toISOString(),
    },
  };

  const { data, error } = await supabase
    .from("profiles")
    .update({ agreements: nextAgreements })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveTipStep({ step, completedAt }) {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) throw userErr || new Error("No user session");

  const userId = userData.user.id;

  // Pull current onboarding so we don't wipe other keys
  const { data: current, error: selErr } = await supabase
    .from("profiles")
    .select("onboarding")
    .eq("id", userId)
    .single();

  if (selErr) throw selErr;

  const nextOnboarding = {
    ...(current?.onboarding || {}),
    tipGuide: { step, ...(completedAt ? { completedAt } : {}) },
  };

  const { data, error } = await supabase
    .from("profiles")
    .update({ onboarding: nextOnboarding })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
