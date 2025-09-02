// pages/api/checkout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import products from "../../src/engine/hm_products.json"; // <-- two levels up

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { sku } = req.body || {};
  const p = (products as any[]).find((x) => x.sku === sku);
  if (!p) return res.status(404).json({ error: "Unknown SKU" });

  // Stub until Stripe is wired:
  return res.status(200).json({ ok: true, url: `/chat?owned=${encodeURIComponent(sku)}` });
}
