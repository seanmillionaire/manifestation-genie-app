import React from "react";

type StateKind = "Clarity" | "Courage" | "Calm" | "Energy";
type Props = {
  outcome: string | null | undefined;
  block: string | null | undefined;
  stateGuess: StateKind | null | undefined;
  onApply: (next: { outcome?: string; block?: string; state?: StateKind | null }) => void;
  onClose: () => void;
};

function Chip({ children, selected, onClick }:{
  children: React.ReactNode; selected?: boolean; onClick: ()=>void
}){
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-2 rounded-md border text-sm mr-2 mb-2 hover:opacity-90 focus:outline-none focus:ring"
      aria-pressed={!!selected}
      style={{ background: selected ? "rgba(255,214,0,0.2)" : "white" }}
    >
      {children}
    </button>
  );
}

export default function TweakChips({ outcome, block, stateGuess, onApply, onClose }: Props){
  const [o, setO] = React.useState(outcome || "");
  const [b, setB] = React.useState(block || "");
  const [s, setS] = React.useState<StateKind | null>(stateGuess || null);
  const [customO, setCustomO] = React.useState("");
  const [customB, setCustomB] = React.useState("");

  const outcomeAlts = [
    outcome || "your outcome",
    "More clients / income",
    "A loving relationship",
    "Deep focus & momentum",
    "Better sleep & energy"
  ];
  const blockAlts = [
    block || "a block",
    "Procrastination",
    "Doubt / Imposter voice",
    "Overwhelm / Stress",
    "Fear of failing"
  ];
  const states: StateKind[] = ["Clarity","Courage","Calm","Energy"];

  return (
    <div className="w-full max-w-3xl mx-auto p-3 rounded-lg border shadow-sm bg-white">
      <div className="text-sm mb-2">
        Quick tweaks—no typing needed. Tap to adjust, or set a custom value.
      </div>

      <div className="mb-3">
        <div className="font-semibold mb-1">Outcome</div>
        <div className="flex flex-wrap">
          {outcomeAlts.map((x,i)=>(
            <Chip key={i} selected={o===x} onClick={()=>setO(x)}>{x}</Chip>
          ))}
          <span className="inline-flex items-center gap-2">
            <input
              aria-label="Custom outcome"
              placeholder="Custom…"
              value={customO}
              onChange={e=>setCustomO(e.target.value)}
              className="px-2 py-2 border rounded-md text-sm"
              style={{ minWidth: 180 }}
            />
            <button
              type="button"
              className="px-2 py-2 border rounded-md text-sm"
              onClick={()=>{ if(customO.trim()) setO(customO.trim()); }}
            >
              Use
            </button>
          </span>
        </div>
      </div>

      <div className="mb-3">
        <div className="font-semibold mb-1">Block</div>
        <div className="flex flex-wrap">
          {blockAlts.map((x,i)=>(
            <Chip key={i} selected={b===x} onClick={()=>setB(x)}>{x}</Chip>
          ))}
          <span className="inline-flex items-center gap-2">
            <input
              aria-label="Custom block"
              placeholder="Custom…"
              value={customB}
              onChange={e=>setCustomB(e.target.value)}
              className="px-2 py-2 border rounded-md text-sm"
              style={{ minWidth: 180 }}
            />
            <button
              type="button"
              className="px-2 py-2 border rounded-md text-sm"
              onClick={()=>{ if(customB.trim()) setB(customB.trim()); }}
            >
              Use
            </button>
          </span>
        </div>
      </div>

      <div className="mb-3">
        <div className="font-semibold mb-1">State</div>
        <div className="flex flex-wrap">
          {states.map(x=>(
            <Chip key={x} selected={s===x} onClick={()=>setS(x)}>{x}</Chip>
          ))}
          <Chip selected={!s} onClick={()=>setS(null)}>No preference</Chip>
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="px-3 py-2 rounded-md border font-medium hover:opacity-90 focus:outline-none focus:ring"
          onClick={()=>onApply({ outcome:o, block:b, state:s })}
        >
          ✅ Looks right
        </button>
        <button
          type="button"
          className="px-3 py-2 rounded-md border font-medium hover:opacity-90 focus:outline-none focus:ring"
          onClick={onClose}
        >
          ✖ Close
        </button>
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true" />
    </div>
  );
}
