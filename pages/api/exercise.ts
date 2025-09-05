// Next.js API route: returns the exercise pack / today's exercise
// and handles DOB numerology calculation.
//
// New code uses TypeScript per rules; pages stay thin; UI calls this API.

import type { NextApiRequest, NextApiResponse } from "next";
import {
  buildExercisePack,
  pickToday,
  type InputCtx,
  type Vibe,
  type Persona,
} from "@/src/engine/exercises";

// ---------- DOB numerology helpers (bug-fixed) ----------
function toInt(n: string | number) {
  return Number.parseInt(String(n), 10);
}

function validateYMD(y: number, m: number, d: number) {
  if (y < 100 || y > 9999) throw new Error("Year out of range");
  if (m < 1 || m > 12) throw new Error("Month out of range");
  const dim = new Date(y, m, 0).getDate();
  if (d < 1 || d > dim) throw new Error("Day out of range");
  const iso = `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d
    .toString()
    .padStart(2, "0")}`;
  return { y, m, d, iso };
}

function normalizeDOB(input: unknown) {
  if (input && typeof input === "object") {
    const any = input as Record<string, unknown>;
    const y = toInt(any.year as number | string);
    const m = toInt(any.month as number | string);
    const d = toInt(any.day as number | string);
    return validateYMD(y, m, d);
  }
  if (typeof input !== "string") throw new Error("DOB must be a string or {year,month,day}");
  const s = input.trim();

  // ISO YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return validateYMD(toInt(m[1]), toInt(m[2]), toInt(m[3]));

  // Slash formats MM/DD/YYYY or DD/MM/YYYY
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const a = toInt(m[1]), b = toInt(m[2]), y = toInt(m[3]);
    let month: number, day: number;
    if (a > 12 && b <= 12) { day = a; month = b; }       // DD/MM/YYYY
    else if (b > 12 && a <= 12) { day = b; month = a; }  // MM/DD/YYYY
    else { month = a; day = b; }                          // default to MM/DD for locale
    return validateYMD(y, month, day);
  }

  throw new Error("Unrecognized DOB format");
}

function sumDigits(n: number) {
  return String(n).split("").reduce((acc, ch) => (/\d/.test(ch) ? acc + Number(ch) : acc), 0);
}
function reduceNum(n: number) {
  while (![11, 22, 33].includes(n) && n > 9) n = sumDigits(n);
  return n;
}
function computeLifePath(y: number, m: number, d: number) {
  const yr = reduceNum(sumDigits(y));
  const mo = reduceNum(sumDigits(m));
  const dy = reduceNum(sumDigits(d));
  return reduceNum(yr + mo + dy);
}

// ---------- API handler ----------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // GET: return exercise pack or today's exercise
    if (req.method === "GET") {
      const vibe = (req.query.vibe as Vibe) || "calm";
      const persona = (req.query.persona as Persona) || "genie1";
      const ctx: InputCtx = {
        desire: (req.query.desire as string) || "",
        blocker: (req.query.blocker as string) || null,
        asset: (req.query.asset as string) || "default",
      };

      const pack = buildExercisePack(ctx, vibe, persona);

      if (req.query.pack === "1") {
        return res.status(200).json({ ok: true, mode: "pack", pack });
      }

      const today = pickToday(pack, ctx.asset);
      return res.status(200).json({ ok: true, mode: "today", exercise: today });
    }

    // POST: actions (e.g., numerology calc)
    if (req.method === "POST") {
      const { action } = (req.body || {}) as { action?: string };

      // /api/exercise  { action: "dob-numerology", dob: "YYYY-MM-DD" | "MM/DD/YYYY" | {year,month,day} }
      if (action === "dob-numerology") {
        // ✅ Important: No comparison vs. user profile DOB — accept any valid date.
        const { dob } = req.body as { dob: string | { year: number; month: number; day: number } };
        const { y, m, d, iso } = normalizeDOB(dob);
        const lifePath = computeLifePath(y, m, d);
        return res.status(200).json({
          ok: true,
          exercise: "dob-numerology",
          input: { iso, y, m, d },
          result: { lifePath },
        });
      }

      // (Optional) stub for future exercise submissions
      if (action === "submit") {
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ ok: false, error: "Unknown action" });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    return res.status(400).json({ ok: false, error: err?.message || "Bad request" });
  }
}
