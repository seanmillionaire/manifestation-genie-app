'use client';
import type { Action } from "@/lib/types";

export default function ActionCard({ a, onSend }:{a:Action; onSend:(a:Action)=>void}) {
  return (
    <div className="card">
      <div className="text-sm opacity-80">{a.goal}</div>
      <div className="text-xs opacity-60 mt-1">Why now: {a.why_now}</div>
      <pre className="mt-3 text-sm">{a.draft}</pre>
      <div className="mt-3 flex items-center justify-between">
        <button className="btn-primary" onClick={()=>onSend(a)}>{a.cta_label}</button>
        <span className="text-xs opacity-60">Success: {a.success_metric}</span>
      </div>
    </div>
  );
}
