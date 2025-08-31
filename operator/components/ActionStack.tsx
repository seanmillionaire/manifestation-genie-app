'use client';
import type { Action } from "@/lib/types";
import ActionCard from "./ActionCard";

export default function ActionStack({ actions, onSend }:{ actions: Action[]; onSend:(a:Action)=>void }) {
  return (
    <div className="grid gap-4">
      {actions.map(a => <ActionCard key={a.id} a={a} onSend={onSend} />)}
    </div>
  );
}
