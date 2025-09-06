// /src/flowState.js
// Single source of truth for the cross-page flow (localStorage-based)

export const STORAGE_KEY = 'mg_chat_state_v1';
export const NAME_KEY = 'mg_first_name';

const def = () => ({
  phase: 'welcome',
  firstName: 'Friend',
  vibe: null,                 // 'BOLD' | 'CALM' | 'RICH'
  currentWish: null,          // { wish, block, micro, vibe, date }
  lastWish: null,
  steps: [],                  // [{id,text,done}]
  thread: []                  // normalized messages: {id, role, author, content, likedByUser, likedByGenie}
});

export function load() {
  if (typeof window === 'undefined') return def();
  try { return { ...def(), ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')) }; }
  catch { return def(); }
}

export function save(state) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  return state;
}

export function get() { return load(); }

export function set(patch) {
  const next = { ...load(), ...(patch || {}) };
  return save(next);
}

export function reset() { return save(def()); }

export function setFirstName(name) {
  const n = (name || '').trim() || 'Friend';
  try { localStorage.setItem(NAME_KEY, n); } catch {}
  return set({ firstName: n });
}

export function getFirstName() {
  if (typeof window === 'undefined') return 'Friend';
  try {
    const n = localStorage.getItem(NAME_KEY);
    return (n && n.trim()) ? n.trim().split(' ')[0] : 'Friend';
  } catch { return 'Friend'; }
}

export function newId(){ return Math.random().toString(36).slice(2,10); }

export function normalizeMsg(m, fallback='You'){
  return {
    id: m.id || newId(),
    role: m.role || 'assistant',
    author: m.author || (m.role === 'assistant' ? 'Genie' : fallback || 'You'),
    content: typeof m.content === 'string' ? m.content : '',
    likedByUser: !!m.likedByUser,
    likedByGenie: !!m.likedByGenie
  };
}

export function pushThread(msg){
  const S = load();
  const thread = [...S.thread, normalizeMsg(msg, S.firstName)];
  return set({ thread }).thread;
}

export function replaceThread(list){
  const S = load();
  const thread = (list || []).map(m => normalizeMsg(m, S.firstName));
  return set({ thread }).thread;
}

export function toPlainMessages(thread){
  const strip = (s='') =>
    s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[^>]+(>|$)/g,'').replace(/\s+/g,' ').trim();
  return (thread || []).map(m => ({ role: m.role, content: strip(m.content || '') }));
}
// --- Daily session bootstrap: create a brand-new chat thread for today ---
export function startNewDaySession(meta = {}) {
  const s = (typeof get === "function" ? get() : {}) || {};
  const todayISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const id = typeof newId === "function" ? newId() : `${Date.now()}`;

  // derive today's intent data from meta or currentWish
  const base = s.currentWish || {};
  const current = {
    id,
    date: todayISO,
    wish: (meta.wish ?? base.wish ?? "").trim(),
    block: (meta.block ?? base.block ?? "").trim(),
    micro: (meta.micro ?? base.micro ?? "").trim(),
    vibe: meta.vibe ?? s.vibe ?? null,
    createdAt: new Date().toISOString(),
  };

  // NOTE: keep any historical threads list if you have one; we just
  // set the "active" thread id + session stamp and clear live messages.
  set({
    ...s,
    threadId: id,                 // 👈 chat.js should read this to scope messages
    lastSessionDate: todayISO,    // 👈 useful to detect day rollover
    currentSession: current,      // 👈 quick access for headers/recap card
    messages: [],                 // 👈 start fresh UI buffer for today
    phase: "chat",
  });

  return id;
}
