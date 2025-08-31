'use client';
import { useState } from "react";

export default function Chat({ onAsk }:{ onAsk:(msg:string)=>void }) {
  const [msg, setMsg] = useState("");
  return (
    <form className="flex gap-2" onSubmit={(e)=>{ e.preventDefault(); onAsk(msg); setMsg(""); }}>
      <input className="input" placeholder="Speak your intention to the Genie…" value={msg} onChange={(e)=>setMsg(e.target.value)} />
      <button className="btn-primary" type="submit">Conjure</button>
    </form>
  );
}
