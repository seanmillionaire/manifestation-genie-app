// pages/chat.js — Manifestation Genie
// Flow: welcome → vibe → resumeNew → questionnaire → checklist → chat
// Supabase name integration + localStorage persistence (per session)

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../src/supabaseClient'

/* =========================
   Signature Language Kit
   ========================= */
const GenieLang = {
  greetings: [
    "The lamp glows… your Genie is here. ✨ What’s stirring in your heart today, {firstName}?",
    "Rub the lamp 🔮 — let’s spark some magic, {firstName}.",
    "The stars whispered your name, {firstName}… shall we begin?",
    "The portal is open 🌌 — step inside, {firstName}."
  ],
  vibePrompt: "Pick your vibe: 🔥 Bold, 🙏 Calm, 💰 Rich. What are we feeling today?",
  resumeOrNew: "Continue the last wish, or spark a fresh one?",
  resumeLabel: "Continue last wish",
  newLabel: "Start a new wish",
  questPrompts: {
    wish:  "What’s the #1 thing you want to manifest? Say it like you mean it.",
    block: "What’s blocking you? Drop the excuse in one line.",
    micro: "What’s 1 micro-move you can make today? Something small."
  },
  rewards: [
    "YES! That’s the one. Door unlocked.",
    "Love it. The signal’s clear — time to move.",
    "Locked in. You're ready. Execute time.",
    "Noted. The window’s open. Step through."
  ],
  closing: "The lamp dims… but the magic stays with you.",
  tinyCTA: "New wish or keep walking the path we opened?"
}

/* =========================
   Helpers
   ========================= */
const todayStr = () => new Date().toISOString().slice(0,10)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const STORAGE_KEY = 'mg_chat_state_v1'
const NAME_KEY = 'mg_first_name'
const newId = () => Math.random().toString(36).slice(2,10)
const injectName = (s, name) => (s || '').replaceAll('{firstName}', name || 'Friend')

const loadState = () => {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
}
const saveState = (state) => {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
}
const getFirstNameFromCache = () => {
  if (typeof window === 'undefined') return 'Friend'
  try {
    const saved = localStorage.getItem(NAME_KEY)
    if (saved && saved.trim()) return saved.trim().split(' ')[0]
  } catch {}
  return 'Friend'
}

// streak announce key (once/day message)
const STREAK_ANNOUNCED_KEY = 'mg_streak_announced_date'
function getAnnouncedDate(){ try { return localStorage.getItem(STREAK_ANNOUNCED_KEY) || null } catch { return null } }
function setAnnouncedToday(){ try { localStorage.setItem(STREAK_ANNOUNCED_KEY, getToday()) } catch {} }

// formatting helpers
const toSocialLines = (text='', wordsPerLine=9) => {
  const soft = text.replace(/\r/g,'').replace(/([.!?])\s+/g,'$1\n').replace(/\s+[-–—]\s+/g,'\n')
  const out = []
  for (const block of soft.split(/\n+/)) {
    const words = block.trim().split(/\s+/).filter(Boolean)
    for (let i=0; i<words.length; i+=wordsPerLine) out.push(words.slice(i,i+wordsPerLine).join(' '))
  }
  return out.join('\n')
}
const nl2br = (s='') => s.replace(/\n/g,'<br/>')

const cosmicOutros = [
  "The stars tilt toward {topic}. ✨",
  "Orbit set; trajectory locked. 🔮",
  "The lamp hums in your direction. 🌙",
  "Gravity favors your move. 🌌",
  "Signals aligned; door unlocked. 🗝️"
]
const COSMIC_METAPHORS = [
  ['visualize','Like plotting stars before a voyage—see it, then sail.'],
  ['assess','Numbers are telescope lenses—clean them and the path sharpens.'],
  ['schedule','Calendars are gravity; what you schedule, orbits you.'],
  ['contact','Knock and the door vibrates; knock twice and it opens.'],
  ['record','One take beats zero takes—silence never went viral.'],
  ['post','Ship the signal so your tribe can find its frequency.'],
  ['email','A good subject line is a comet tail—impossible to ignore.'],
  ['apply','Forms are portals; boring but they warp reality when complete.'],
  ['practice','Reps are runways—every pass smooths the landing.'],
  ['learn','Knowledge is dark matter—unseen, but it holds your galaxy.']
]
function explainLine(line=''){
  const L = line.trim(); if(!L) return ''
  if (/(The lamp|orbit|stars|gravity|cosmos|Signals aligned)/i.test(L)) return L
  let add = null
  for (const [k,meta] of COSMIC_METAPHORS){ if (new RegExp(`\\b${k}\\b`,'i').test(L)){ add = meta; break } }
  if (!add) add = 'Do it small and soon—momentum makes its own magic.'
  const hasEmoji = /^[^\w\s]/.test(L)
  const base = hasEmoji ? L : `✨ ${L}`
  return `${base}\n<span style="opacity:.8">— ${add}</span>`
}
function wittyCloser(topic='this'){
  const z = [
    `I’ll hold the lamp; you push the door on “${topic}.”`,
    `Pro tip: perfection is a black hole—aim for orbit.`,
    `If the muse calls, let it go to voicemail—ship first.`,
    `Cosmos math: tiny action × today > giant plan × someday.`,
  ]
  return z[Math.floor(Math.random()*z.length)]
}
function ensureNoNumberedLists(s=''){ return s.replace(/^\s*\d+\.\s*/gm,'• ').replace(/^\s*-\s*/gm,'• ') }
function bulletize(s=''){
  return sassistantជា
