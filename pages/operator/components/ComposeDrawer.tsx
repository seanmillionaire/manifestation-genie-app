'use client';
import { useEffect, useState } from "react";
import type { Action } from "@/lib/types";

export function ComposeDrawer({open, action, onClose, onLogged}:{open:boolean; action:Action|null; onClose:()=>void; onLogged:()=>void}) {
  const [text, setText] = useState(action?.draft || "");
  useEffect(() => setText(action?.draft || ""), [action]);

  if (!open || !action) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const send = async () => {
    await fetch("/api/send", { method: "POST", body: JSON.stringify({ action, body: text }) });
    await copy();
    onLogged();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-[#121222] border-t border-white/10 rounded-t-2xl p-4">
        <div className="text-sm opacity-70 mb-2">Infuse your intention, then release this wish.</div>
        <textarea value={text} onChange={(e)=>setText(e.target.value)} className="input h-48" />
        <div className="flex items-center gap-2 mt-3">
          <button className="btn-primary" onClick={send}>Release this wish</button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
        <div className="text-xs opacity-60 mt-2">This will copy the draft to your clipboard and log a win.</div>
      </div>
    </div>
  );
}
