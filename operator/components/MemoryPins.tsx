'use client';
import { usePins } from "@/lib/memory";

export default function MemoryPins() {
  const { pins } = usePins();
  return (
    <div className="card">
      <div className="font-medium mb-2">Aligned souls in your orbit</div>
      <ul className="space-y-1 text-sm opacity-80">
        {pins.map((p, i)=> <li key={i}>• {p}</li>)}
      </ul>
    </div>
  );
}
