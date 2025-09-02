import type { NextApiRequest, NextApiResponse } from "next";
import products from "@/src/engine/hm_products.json";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json(products);
}
