// components/Shared/MagicalButton.jsx
export default function MagicalButton({ disabled, onClick, children }) {
  return (
    <div className="wrap">
      {/* soft glow aura */}
      {!disabled && <div className="aura" aria-hidden="true" />}

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`btn ${disabled ? "btn--disabled" : "btn--live"}`}
      >
        {/* shimmer sweep */}
        {!disabled && (
          <span className="shimmer" aria-hidden="true">
            <span className="bar" />
          </span>
        )}
        {/* sparkles */}
        {!disabled && (
          <>
            <span className="spark s1" aria-hidden="true" />
            <span className="spark s2" aria-hidden="true" />
            <span className="spark s3" aria-hidden="true" />
          </>
        )}
        <span className="label">{children}</span>
      </button>

      <style jsx>{`
        /* design tokens */
        :root {
          --btn-h: 56px;                 /* 44px+ touch target */
          --btn-radius: 16px;
          --grad-1: #ffe082;             /* warm, magical golds */
          --grad-2: #ffd54f;
          --grad-3: #ffca28;
          --text: #111;
          --glow: 0 0 24px rgba(255, 214, 0, 0.45);
          --glow-strong: 0 0 40px rgba(255, 214, 0, 0.65);
          --ring: rgba(255, 214, 0, 0.5);
        }

        .wrap {
          position: relative;
          width: 100%;
          isolation: isolate; /* keep glow behind */
        }

        .aura {
          position: absolute;
          inset: -6px;
          border-radius: calc(var(--btn-radius) + 8px);
          background: radial-gradient(120% 120% at 50% 0%,
            rgba(255, 248, 200, 0.45), rgba(255, 214, 0, 0.25), transparent 70%);
          filter: blur(10px);
          pointer-events: none;
          animation: glowPulse 2.4s ease-in-out infinite;
        }

        .btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          min-height: var(--btn-h);
          border: 0;
          border-radius: var(--btn-radius);
          font-weight: 900;
          font-size: 18px;
          letter-spacing: -0.2px;
          padding: 12px 18px;
          cursor: pointer;
          transition: transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease;
          outline: none;
        }

        .btn--live {
          color: var(--text);
          background-image: linear-gradient(90deg, var(--grad-1), var(--grad-2), var(--grad-3));
          box-shadow: var(--glow);
          animation: pop 1.6s ease-in-out infinite;
        }

        .btn--live:hover {
          transform: translateY(-1px) scale(1.02);
          box-shadow: var(--glow-strong);
        }

        .btn--live:active {
          transform: translateY(0) scale(0.99);
        }

        .btn--disabled {
          background: #ffe680;
          color: #7a6600;
          cursor: not-allowed;
          opacity: 0.85;
        }

        .btn:focus-visible {
          box-shadow: 0 0 0 4px var(--ring);
        }

        /* shimmer sweep container */
        .shimmer {
          position: absolute;
          inset: 0;
          overflow: hidden;
          border-radius: var(--btn-radius);
          pointer-events: none;
        }

        .bar {
          position: absolute;
          top: -20%;
          left: -30%;
          width: 40%;
          height: 140%;
          transform: skewX(-20deg);
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.65) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          animation: shimmer 1.8s linear infinite;
        }

        /* sparkles */
        .spark {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 0 16px rgba(255, 255, 255, 0.9);
          pointer-events: none;
          animation: twinkle 1.8s ease-in-out infinite;
        }

        .s1 { left: 10px; top: 6px; animation-delay: 0s; }
        .s2 { right: 12px; bottom: 8px; animation-delay: .6s; }
        .s3 { left: -6px; bottom: 14px; animation-delay: 1.2s; }

        /* keyframes */
        @keyframes pop {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.03); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: .65; filter: blur(10px); }
          50%      { opacity: 1;   filter: blur(12px); }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-120%) skewX(-20deg); }
          100% { transform: translateX(220%)  skewX(-20deg); }
        }
        @keyframes twinkle {
          0%   { opacity: 0; transform: translateY(0) scale(.8); }
          50%  { opacity: 1; transform: translateY(-4px) scale(1); }
          100% { opacity: 0; transform: translateY(0) scale(.8); }
        }

        /* respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .aura,
          .btn--live,
          .bar,
          .spark { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
