import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const payload = await req.json();
  // In real life, dispatch via Gmail/Twilio/etc. Here we just echo success.
  return NextResponse.json({ ok: true, echo: payload });
}
