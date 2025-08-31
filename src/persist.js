// src/persist.js
import { supabase } from "./lib/supabaseClient"; // you already have this
import { get, set } from "./flowState";

const AGREEMENT_VERSION = "v1"; // keep in one place
export { AGREEMENT_VERSION };

export async function loadAllIntoFlowState() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // not logged in

  const uid = user.id;

  const [prof, agree, state] = await Promise.all([
    supabase.from("user_profile").select("first_name").eq("user_id", uid).maybeSingle(),
    supabase.from("agreement_acceptance").select("version, accepted_at").eq("user_id", uid).eq("version", AGREEMENT_VERSION).maybeSingle(),
    supabase.from("user_state").select("vibe, wish, block, micro").eq("user_id", uid).maybeSingle(),
  ]);

  // profile
  const firstName = prof.data?.first_name || get().firstName || "Friend";
  // agreement
  const agreement = agree.data ? { version: agree.data.version, acceptedAt: agree.data.accepted_at } : null;
  // state
  const vibe  = state.data?.vibe  ?? get().vibe ?? null;
  const wish  = state.data?.wish  ?? get().currentWish?.wish ?? null;
  const block = state.data?.block ?? get().currentWish?.block ?? null;
  const micro = state.data?.micro ?? get().currentWish?.micro ?? null;

  set({
    firstName,
    agreement,
    vibe,
    currentWish: (wish || block || micro)
      ? { wish, block, micro }
      : (get().currentWish || null),
  });

  // optional: also mirror name to localStorage like Chat does
  if (typeof window !== "undefined") {
    localStorage.setItem("mg_first_name", firstName);
  }
}

export async function saveProfileFirstName(firstName) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const uid = user.id;

  await supabase.from("user_profile").upsert({ user_id: uid, first_name: firstName });
  set({ firstName });

  if (typeof window !== "undefined") {
    localStorage.setItem("mg_first_name", firstName);
    window.dispatchEvent(new StorageEvent("storage", { key: "mg_first_name", newValue: firstName }));
  }
}

export async function saveAgreementAccepted() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const uid = user.id;

  const acceptedAt = new Date().toISOString();
  await supabase
    .from("agreement_acceptance")
    .upsert({ user_id: uid, version: AGREEMENT_VERSION, accepted_at: acceptedAt });

  set({ agreement: { version: AGREEMENT_VERSION, acceptedAt } });
  if (typeof window !== "undefined") {
    localStorage.setItem(`mg_agreed_${AGREEMENT_VERSION}`, acceptedAt);
  }
}

export async function saveState({ vibe, wish, block, micro }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const uid = user.id;

  // use values from args, fall back to flowState so partial saves work
  const cur = get();
  const payload = {
    user_id: uid,
    vibe:  vibe  ?? cur.vibe ?? null,
    wish:  wish  ?? cur.currentWish?.wish ?? null,
    block: block ?? cur.currentWish?.block ?? null,
    micro: micro ?? cur.currentWish?.micro ?? null,
  };

  await supabase.from("user_state").upsert(payload);

  // reflect to flowState
  set({
    vibe: payload.vibe,
    currentWish: { wish: payload.wish, block: payload.block, micro: payload.micro }
  });
}
