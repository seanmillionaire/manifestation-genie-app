'use client';

import { useEffect, useState } from "react";
import Image from "next/image";
import KPIs from "@/components/KPIs";
import CosmicGem from "@/components/CosmicGem";
import ActionStack from "@/components/ActionStack";
import MemoryPins from "@/components/MemoryPins";
import Chat from "@/components/Chat";
import { ComposeDrawer } from "@/components/ComposeDrawer";
import type { Action, AgentResponse } from "@/lib/types";
import { useKPIs } from "@/lib/memory";

export default function Page() {
  const [data, setData] = useState<AgentResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Action | null>(null);
  const { kpis, setKpis } = useKPIs();

  const load = async (message: string) => {
    const res = await fetch("/api/agent", { method: "POST", body: JSON.stringify({ message }) });
    const json = await res.json();
    setData(json);
  };

  useEffect(() => { load("seed"); }, []);

  const onSend = (a: Action) => {
    setSelected(a);
    setOpen(true);
  };

  const onLogged = () => {
    setKpis({ ...kpis, sends: kpis.sends + 1, wins: kpis.wins + 1 });
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 mb-2">
        <Image src="/logo.svg" alt="logo" width={36} height={36} />
        <div>
          <div className="text-lg font-semibold">Manifestation Genie</div>
          <div className="text-xs opacity-70">Mystical, action-first revenue copilot</div>
        </div>
      </header>

      <KPIs />

      {data?.cosmic_gem && <CosmicGem gem={data.cosmic_gem} />}

      <section className="grid md:grid-cols-[1fr,300px] gap-4">
        <div>
          <div className="card mb-3">
            <div className="text-sm opacity-70">✨ Drafting 1–3 manifestation steps for you…</div>
          </div>
          {data && <ActionStack actions={data.actions} onSend={onSend} />}
        </div>
        <div className="space-y-4">
          <MemoryPins />
          <div className="card">
            <div className="text-sm opacity-80 mb-2">Manifestation Ledger</div>
            <div className="text-xs opacity-70">Track wishes released and granted today. The universe loves consistency.</div>
          </div>
        </div>
      </section>

      <div className="card">
        <Chat onAsk={load} />
      </div>

      <ComposeDrawer open={open} action={selected} onClose={()=>setOpen(false)} onLogged={onLogged} />
    </div>
  );
}
