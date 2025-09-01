// /src/flowState.js — single source of truth + pub/sub
export const STORAGE_KEY = 'mg_chat_state_v1';
export const NAME_KEY    = 'mg_first_name';

// Simple event name so screens can resubscribe
const EVT = 'mg:state';

const defaults = () => ({
  phase: 'welcome',
  firstName: 'Friend',
  vibe: null,                 // 'BOLD' | 'CALM' | 'RICH'
  currentWish: null,          // { wish, block, micro, vibe, date }
  lastWish: null,
  steps: [],                  // [{ id, text, done }]
  thread: []                  // normalized messages
});

function safeParse(json, fallback){
  try { return JSON.parse(json) ?? fallback } catch { return fallback }
}

export function load(){
  if (typeof window === 'undefined') return defaults();
  const raw = localStorage.getItem(STORAGE_KEY);
  const s = safeParse(raw, defaults());
  // Soft-override from NAME_KEY if present (legacy)
  const nk = localStorage.getItem(NAME_KEY);
  if (nk && nk !== s.firstName) s.firstName = nk;
  return s;
}

export function save(state){
  if (typeof window === 'undefined') return state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  // Also keep NAME_KEY in sync for any legacy reads
  if (state.firstName) localStorage.setItem(NAME_KEY, state.firstName);
  // Broadcast
  window.dispatchEvent(new CustomEvent(EVT));
  return state;
}

export function get(){ return load() }

export function set(patch){
  const cur = load();
  const next = { ...cur, ...(patch || {}) };
  return save(next);
}

export function setFirstName(name){
  const first = normalizeFirstName(name) || 'Friend';
  return set({ firstName: first }).firstName;
}

export function newId(){ return Math.random().toString(36).slice(2) }

export function normalizeMsg(m={}, first='Friend'){
  const base = {
    id: m.id || newId(),
    role: m.role || 'assistant',
    author: m.author || (m.role === 'user' ? (first || 'You') : 'Genie'),
    content: (m.content ?? '').toString().trim(),
    likedByUser: !!m.likedByUser,
    likedByGenie: !!m.likedByGenie
  };
  return base;
}

export function pushThread(msg){
  const S = load();
  const item = normalizeMsg(msg, S.firstName);
  const thread = [...(S.thread || []), item];
  return set({ thread }).thread;
}

export function replaceThread(list){
  const S = load();
  const thread = (list || []).map(m => normalizeMsg(m, S.firstName));
  return set({ thread }).thread;
}

export function toPlainMessages(thread){
  const strip = (s='') => s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g,'')
    .replace(/\s+/g,' ')
    .trim();
  return (thread || []).map(m => ({ role: m.role, content: strip(m.content || '') }));
}

export function subscribe(handler){
  if (typeof window === 'undefined') return () => {};
  const fn = () => handler(load());
  window.addEventListener(EVT, fn);
  return () => window.removeEventListener(EVT, fn);
}

function normalizeFirstName(s){
  if (!s) return null;
  const first = String(s).trim().split(/\s+/)[0] || null;
  if (!first) return null;
  if (first.length < 2) return null;
  if (/[0-9_@]/.test(first)) return null;
  return first.replace(/\b\w/g, c => c.toUpperCase());
}
