type AcceptBody = { version: number };
type TipStepBody = { step: number; completedAt?: string };

export async function getMe() {
  const r = await fetch("/api/me", { credentials: "include" });
  if (!r.ok) throw new Error("Failed to load profile");
  return r.json();
}

export async function acceptManifestForGood(body: AcceptBody) {
  const r = await fetch("/api/agreements/manifest-for-good", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, accepted: true }),
    credentials: "include",
  });
  if (!r.ok) throw new Error("Failed to save agreement");
  return r.json();
}

export async function saveTipStep(body: TipStepBody) {
  const r = await fetch("/api/onboarding/tip-guide", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!r.ok) throw new Error("Failed to save tip step");
  return r.json();
}