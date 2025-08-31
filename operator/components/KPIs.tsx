'use client';
import { useKPIs } from "@/lib/memory";

export default function KPIs() {
  const { kpis } = useKPIs();
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div className="card kpi"><div className="opacity-70">✨ Wishes released</div><div className="text-2xl font-semibold">{kpis.sends}</div></div>
      <div className="card kpi"><div className="opacity-70">💖 Wishes granted</div><div className="text-2xl font-semibold">{kpis.wins}</div></div>
      <div className="card kpi"><div className="opacity-70">📥 Replies</div><div className="text-2xl font-semibold">{kpis.replies}</div></div>
      <div className="card kpi"><div className="opacity-70">💸 Revenue</div><div className="text-2xl font-semibold">${kpis.revenue}</div></div>
    </div>
  );
}
