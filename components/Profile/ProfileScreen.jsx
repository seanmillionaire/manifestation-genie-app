import { useEffect, useState } from "react";

export default function ProfileScreen() {
  const [firstName, setFirstName] = useState("Friend");

  useEffect(() => {
    // read from localStorage only; no store/Supabase yet
    try {
      const v = localStorage.getItem("mg_first_name");
      if (v && v.trim()) setFirstName(v.trim());
    } catch {}
  }, []);

  return (
    <main style={{ width: "min(900px, 94vw)", margin: "30px auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 12px" }}>Profile</h1>
      <p className="text-sm text-black/60 h-5" aria-live="polite">Rebuilding fields…</p>

      <section style={{border:"1px solid rgba(0,0,0,0.08)",borderRadius:12,padding:12,background:"#fafafa"}}>
        <div style={{background:"white",border:"1px solid rgba(0,0,0,0.10)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Your info</div>
          <div style={{ fontSize: 14 }}><strong>Name:</strong> {firstName}</div>
        </div>

        {/* leave the rest blank for now */}
        <div style={{background:"white",border:"1px solid rgba(0,0,0,0.10)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Current vibe</div>
          <div style={{ fontSize: 14 }}>—</div>
        </div>

        <div style={{background:"white",border:"1px solid rgba(0,0,0,0.10)",borderRadius:12,padding:"14px 16px",marginBottom:12}}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Current wish</div>
          <div style={{ fontSize: 14 }}>
            <div><strong>Wish:</strong> —</div>
            <div><strong>Block:</strong> —</div>
            <div><strong>Micro-step:</strong> —</div>
          </div>
        </div>

        <div style={{background:"white",border:"1px solid rgba(0,0,0,0.10)",borderRadius:12,padding:"14px 16px"}}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Ethical agreement</div>
          <div style={{ fontSize: 14 }}>—</div>
        </div>
      </section>
    </main>
  );
}
