# Manifestation Genie — Revenue Operator (Full Build)

Mystical brand, ruthless outcomes. This Next.js app turns every chat into **1–3 “manifestation steps”** with ready-to-send drafts (email/DM/etc.), plus a gentle layer of **cosmic gems** to entrain the user's state.

## ✨ What you get
- **Operator engine**: 1–3 high-odds actions with sendable drafts.
- **Manifestation skin**: "Wishes released", "Release this wish", poetic gems.
- **KPIs**: wishes released, granted, replies, revenue (local for now).
- **Compose Drawer**: copy-to-clipboard + log a win.
- **Zero-config**: works out of the box (fallback agent).

## 🧱 Tech
- Next.js 14 (App Router), TypeScript, Tailwind.
- Zod schema to enforce safe agent responses.
- Mock send endpoint (`/api/send`) — swaps later for real providers.

## 🚀 Quick start
```bash
npm i
npm run dev
# open http://localhost:3000
```

## 🔐 Optional: Real model calls
This build ships with a **deterministic fallback agent** so you can run without keys. If you want to wire GPT, add `.env.local`:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.1-thinking
OPENAI_BASE_URL=https://api.openai.com/v1
```

Then update `/app/api/agent/route.ts` to call your provider (kept as TODO).

## 📦 Deploy
Standard Next.js deploy (Vercel, Render, etc.).
If you're only uploading to GitHub:
```bash
git init
git add -A
git commit -m "feat: Manifestation Genie — Revenue Operator (cosmic)"
git branch -M main
git remote add origin <repo-url>
git push -u origin main
```

## 🗺️ Roadmap
- Provider adapters: Gmail/Outlook, Twilio/WhatsApp, Calendars.
- Supabase/Postgres storage for KPIs, pins, deals, messages.
- Reply tracking hooks → auto-increment Replies and Revenue.
- A/B tone tuning for gems and drafts per avatar.

---

Licensed MIT. Create beautifully, sell kindly. 🌙
