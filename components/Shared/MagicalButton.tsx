type Props = {
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
};

export default function MagicalButton({ disabled, onClick, children }: Props) {
  return (
    <div className="wrap">
      {!disabled && <div className="aura" aria-hidden="true" />}

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`btn ${disabled ? "btn--disabled" : "btn--live"}`}
      >
        {!disabled && (
          <span className="shimmer" aria-hidden="true">
            <span className="bar" />
          </span>
        )}

        {!disabled && (
          <>
            <span className="glitter g1" aria-hidden="true" />
            <span className="glitter g2" aria-hidden="true" />
            <span className="glitter g3" aria-hidden="true" />
            <span className="glitter g4" aria-hidden="true" />
          </>
        )}

        <span className="label">{children}</span>
      </button>

      <style jsx>{`
        /* tokens */
        :root{
          --h:64px;            /* big tap target */
          --r:18px;
          --o1:#ff9f1a;        /* orange gradient */
          --o2:#ff7a00;
          --o3:#ff5607;
          --text:#140a00;
          --ring:rgba(255,152,0,.55);
        }

        .wrap{ position:relative; width:100%; isolation:isolate; }

        .aura{
          position:absolute; inset:-10px;
          border-radius:calc(var(--r) + 10px);
          background: radial-gradient(60% 80% at 50% 0%,
            rgba(255,200,120,.55), rgba(255,140,0,.35), transparent 70%);
          filter: blur(16px);
          animation: auraPulse 2s ease-in-out infinite;
          pointer-events:none;
        }

        .btn{
          position:relative;
          display:inline-flex; align-items:center; justify-content:center;
          gap:12px; width:100%;
          min-height:var(--h); padding:14px 22px;
          border:0; border-radius:var(--r);
          font-weight:900; font-size:20px; letter-spacing:.1px;
          cursor:pointer; outline:none;
          transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease;
          user-select:none;
        }

        .btn--live{
          color:#fff;
          background-image: linear-gradient(90deg, var(--o1), var(--o2), var(--o3));
          box-shadow: 0 10px 28px rgba(255,120,0,.5), 0 2px 0 rgba(0,0,0,.08) inset;
          animation: pop 1.4s ease-in-out infinite;
        }
        .btn--live:hover{ transform: translateY(-1px) scale(1.02); }
        .btn--live:active{ transform: translateY(0) scale(.99); }

        .btn--disabled{
          background:#ffd9a6; color:#7a3d00; cursor:not-allowed; opacity:.85;
          box-shadow:none;
        }

        .btn:focus-visible{ box-shadow: 0 0 0 4px var(--ring); }

        /* shimmer sweep */
        .shimmer{ position:absolute; inset:0; overflow:hidden; border-radius:var(--r); pointer-events:none; }
        .bar{
          position:absolute; top:-25%; left:-35%;
          width:45%; height:150%; transform: skewX(-20deg);
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%,
                                     rgba(255,255,255,.75) 50%,
                                     rgba(255,255,255,0) 100%);
          mix-blend-mode: screen;
          animation: shimmer 1.6s linear infinite;
        }

        /* glitter bits */
        .glitter{
          position:absolute; width:10px; height:10px; border-radius:50%;
          background:#fff; box-shadow:0 0 22px rgba(255,255,255,.95);
          pointer-events:none; animation: sparkle 1.6s ease-in-out infinite;
        }
        .g1{ left:14px;  top:10px;   animation-delay:0s; }
        .g2{ right:16px; bottom:12px;animation-delay:.4s; }
        .g3{ left:-6px;  bottom:18px;animation-delay:.8s; }
        .g4{ right:6px;  top:-8px;   animation-delay:1.2s; }

        /* keyframes */
        @keyframes pop{ 0%,100%{ transform:scale(1);} 50%{ transform:scale(1.04);} }
        @keyframes auraPulse{ 0%,100%{ opacity:.7; filter:blur(16px);} 50%{ opacity:1; filter:blur(22px);} }
        @keyframes shimmer{ 0%{ transform:translateX(-120%) skewX(-20deg);} 100%{ transform:translateX(220%) skewX(-20deg);} }
        @keyframes sparkle{
          0%{ opacity:0; transform: translateY(0) scale(.7) rotate(0deg); }
          50%{ opacity:1; transform: translateY(-6px) scale(1) rotate(15deg); }
          100%{ opacity:0; transform: translateY(0) scale(.7) rotate(0deg); }
        }

        /* respect reduced motion */
        @media (prefers-reduced-motion: reduce){
          .aura,.bar,.glitter,.btn--live{ animation:none !important; }
        }
      `}</style>
    </div>
  );
}
