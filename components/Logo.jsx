// /components/Logo.jsx
export default function Logo({ size = 48, withText = false }) {
  const s = Number(size);
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:12 }}>
      <svg
        width={s}
        height={s}
        viewBox="0 0 64 64"
        aria-label="Manifestation Genie Logo"
        style={{ filter:'drop-shadow(0 0 10px rgba(90,24,154,0.55))' }}
      >
        {/* Midnight backdrop */}
        <circle cx="32" cy="32" r="30" fill="#0D1B2A" stroke="#FFD700" strokeWidth="2" />
        
        {/* Purple glow */}
        <circle cx="32" cy="32" r="22" fill="url(#glow)" />

        {/* Gold lamp */}
        <path
          d="M44 30c0 4-6 7-14 7-1.7 0-3.3-.1-4.8-.4-1.4 1.6-3.3 2.7-5.4 3h-2.4c2.1-.8 3.8-2.3 4.9-4.2-2.4-1.3-3.9-3-3.9-4.9 0-3.9 6.3-7 14.1-7s14.1 3.1 14.1 6.5c0 .4-.1.8-.2 1.2 2.1.5 3.6 1.8 3.6 3.4 0 2.1-2.6 3.6-6.2 3.6-.8 0-1.6-.1-2.4-.3.9-.7 1.5-1.6 1.5-2.6 0-1.8-1.9-3.3-4.9-4.3z"
          fill="#FFD700"
        />

        {/* Energy swirl */}
        <path
          d="M18 24c6-6 20-6 26 0"
          stroke="#FFD700"
          strokeWidth="1.5"
          fill="none"
          opacity="0.7"
        />

        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5A189A" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#5A189A" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      {withText && (
        <div style={{ lineHeight:1 }}>
          <div style={{ fontWeight:800, fontSize:16, color:'var(--gold)' }}>
            Manifestation
          </div>
          <div style={{ fontWeight:800, fontSize:16, color:'var(--gold)' }}>
            Genie
          </div>
        </div>
      )}
    </div>
  );
}
