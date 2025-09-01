// src/lib/genieReact.js
export function genieReact(userMsg) {
  const lower = userMsg.toLowerCase();

  if (lower.includes("$1m") || lower.includes("1m") || lower.includes("million")) {
    return "😲🔥 HOLY WOW!!! That’s HUGE! I’m blown away — this is legendary!";
  }

  if (lower.includes("love")) {
    return "💖 WOW! My heart’s racing — that’s the vibe!!";
  }

  if (lower.includes("goal") || lower.includes("dream")) {
    return "🌟 YES!! This is what we live for. Big dreams, big energy!";
  }

  // default fallback (no special reaction)
  return null;
}
