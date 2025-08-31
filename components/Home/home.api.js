// Adjust these endpoints if your backend differs.
// This keeps the build happy and the UI wired.

export async function getMe() {
  const r = await fetch("/api/me", { credentials: "include" });
  if (!r.ok) throw new Error("Failed to load profile");
  return r.json();
}

export async function acceptManifestForGood({ version }) {
  const r = await fetch("/api/agreements/manifest-for-good", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version, accepted: true }),
    credentials: "include",
  });
  if (!r.ok) throw new Error("Failed to save agreement");
  return r.json();
}

export async function saveTipStep(body) {
  const r = await fetch("/api/onboarding/tip-guide", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!r.ok) throw new Error("Failed to save tip step");
  return r.json();
}
