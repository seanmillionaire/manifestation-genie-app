import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_MESSAGES = [
  '🌍 4,327 people logged in to Manifestation Genie today.',
  '🔥 14,201 actions completed this week inside Manifestation Genie.',
  '🎯 James completed his 7‑day streak with Manifestation Genie.',
  '💡 Maria in California finished today’s Manifestation Genie action step.',
  '💰 Ashley celebrated paying off $1,000 using Manifestation Genie’s guidance.',
  '🧘 427 users finished their mindfulness prompt in Manifestation Genie today.',
  '🚀 David marked a 30‑day consistency streak in Manifestation Genie.',
  '✨ 93% of new users completed at least 1 action in Manifestation Genie this week.',
  '🎉 Sarah hit her first milestone: publishing her blog, tracked with Manifestation Genie.',
  '🌟 17,482 people took action through Manifestation Genie this month.',
];

type Props = { messages?: string[]; intervalMs?: number };

export default function FomoFeed({ messages = DEFAULT_MESSAGES, intervalMs = 4000 }: Props) {
  const [idx, setIdx] = useState(0);
  const paused = useRef(false);
  const current = useMemo(() => messages[idx % messages.length], [idx, messages]);

  useEffect(() => {
    if (!messages.length) return;
    const t = setInterval(() => {
      if (!paused.current) setIdx((i) => (i + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(t);
  }, [messages.length, intervalMs]);

  return (
    <div
      className="mt-4 rounded-lg border border-white/10 bg-white/5 backdrop-blur px-4 py-3 text-sm md:text-base text-white/90"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      aria-live="polite"
      role="status"
    >
      <div className="whitespace-pre-line">{current}</div>
    </div>
  );
}
