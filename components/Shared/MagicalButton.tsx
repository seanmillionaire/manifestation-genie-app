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
          className="pointer-events-none absolute -inset-2 rounded-2xl blur-xl 
                     bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 
                     animate-[auraPulse_2s_ease-in-out_infinite]"
          aria-hidden="true"
        />
      )}

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={[
          "relative z-10 w-full min-h-[64px] rounded-2xl px-6 text-lg font-black tracking-tight",
          "outline-none focus-visible:ring-4 focus-visible:ring-orange-400/60",
          disabled
            ? "bg-orange-200 text-orange-800 cursor-not-allowed"
            : "bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white shadow-xl animate-[pop_1.4s_ease-in-out_infinite]",
        ].join(" ")}
      >
        <span className="relative flex items-center justify-center gap-2">
          {!disabled && (
            <span
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
              aria-hidden="true"
            >
              {/* shimmer sweep */}
              <span className="absolute top-0 left-0 h-full w-1/3 -skew-x-12 opacity-40
                               bg-white animate-[shimmer_1.6s_linear_infinite]" />
            </span>
          )}
          {children}
        </span>
      </button>

      {/* sparkles */}
      {!disabled && (
        <>
          <Sparkle className="left-3 top-2" delay="0s" />
          <Sparkle className="right-4 -bottom-2" delay=".5s" />
          <Sparkle className="-left-2 bottom-4" delay="1s" />
          <Sparkle className="right-2 top-0" delay="1.5s" />
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
        "pointer-events-none absolute h-3 w-3 rounded-full bg-white",
        "shadow-[0_0_24px_rgba(255,255,255,0.9)] animate-[twinkle_1.8s_ease-in-out_infinite]",
        className,
      ].join(" ")}
    />
  );
}
