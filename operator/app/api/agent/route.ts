import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fallbackAgent } from "@/lib/agent";

const Action = z.object({
  id: z.string(),
  goal: z.string(),
  why_now: z.string(),
  channel: z.enum(["email","sms","whatsapp","slack","calendar"]),
  cta_label: z.string(),
  draft: z.string(),
  success_metric: z.string(),
  deadline: z.string().optional()
});

const AgentResponse = z.object({
  summary: z.string(),
  actions: z.array(Action).min(1).max(3),
  memory_updates: z.record(z.any()).optional(),
  cosmic_gem: z.string().nullable().optional()
});

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  // TODO: if OPENAI_API_KEY present, call real model. For now use fallback deterministic agent.
  const ai = await fallbackAgent(message || "");
  const parsed = AgentResponse.parse(ai);
  return NextResponse.json(parsed);
}

export async function GET() {
  const ai = await fallbackAgent("seed");
  const parsed = AgentResponse.parse(ai);
  return NextResponse.json(parsed);
}
