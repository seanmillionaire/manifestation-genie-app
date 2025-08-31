'use client';

import { useEffect, useState } from "react";
import type { KPIs } from "./types";

const KEY = "mg_kpis_v1";
const PINS = "mg_pins_v1";

export function useKPIs() {
  const [kpis, setKpis] = useState<KPIs>({ wins: 0, sends: 0, replies: 0, revenue: 0 });
  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) setKpis(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(kpis));
  }, [kpis]);
  return { kpis, setKpis };
}

export function usePins() {
  const [pins, setPins] = useState<string[]>(["Amy Chen — warm", "Diego — invoice pending"]);
  useEffect(() => {
    const saved = localStorage.getItem(PINS);
    if (saved) setPins(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem(PINS, JSON.stringify(pins));
  }, [pins]);
  return { pins, setPins };
}
