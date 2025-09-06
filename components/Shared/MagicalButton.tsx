type Props = {
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
};

export default function MagicalButton({ disabled, onClick, children }: Props) {
  return (
    <div className="relative w-full isolate">
      {!disabled && (
        <div
          className="pointer-events-none absolute -inset-1 rounded-2xl blur-lg 
                     bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-400 
                     animate-pulse"
          aria-hidden="true"
        />
      )}

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={[
          "relative z-10 w-full min-h-[56px] rounded-2xl px-5 font-black tracking-tight",
          "outline-none focus-visible:ring-4 focus-visible:ring-yellow-300/60",
          disabled
            ? "bg-yellow-200 text-yellow-800 cursor-not-allowed"
            : "bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-400 text-black shadow-lg animate-[pop_1.6s_ease-in-out_infinite]",
        ].join(" ")}
      >
        <span className="relative flex items-center justify-center gap-2">
          {!disabled && (
            <span
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
              aria-hidden="true"
            >
              <span className="absolute top-0 left-0 h-full w-1/3 -skew-x-12 opacity-40
                               bg-white animate-[shimmer_1.8s_linear_infinite]" />
            </span>
          )}
          {children}
        </span>
      </button>

      {!disabled && (
        <>
          <Sparkle className="left-2 top-0" delay="0s" />
          <Sparkle className="right-3 -bottom-1" delay=".6s" />
          <Sparkle className="-left-1 bottom-3" delay="1.2s" />
        </>
      )}
    </div>
  );
}

function Sparkle({ className = "", delay = "0s" }) {
  return (
    <span
      aria-hidden="true"
      style={{ animationDelay: delay }}
      className={[
        "pointer-events-none absolute h-2 w-2 rounded-full bg-white/90",
        "shadow-[0_0_16px_rgba(255,255,255,.9)] animate-[twinkle_1.8s_ease-in-out_infinite]",
        className,
      ].join(" ")}
    />
  );
}
