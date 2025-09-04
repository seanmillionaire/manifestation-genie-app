// /pages/api/exercise.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { buildExercisePack, pickToday } from '../../src/engine/exercises'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { desire, blocker, asset, vibe = 'calm', persona = 'genie1' } = (req.body || {}) as {
      desire?: string; blocker?: string; asset?: string; vibe?: any; persona?: any;
    };
    if (!desire || !asset) {
      return res.status(400).json({ error: 'Missing inputs', need: { desire: true, asset: true } });
    }
    const pack = buildExercisePack({ desire, blocker: blocker || 'resistance', asset }, vibe, persona);
    const exercise = pickToday(pack, asset);
    res.status(200).json({ exercise, packCount: pack.length, dayKey: new Date().toISOString().slice(0,10) });
  } catch (e: any) {
    res.status(500).json({ error: 'exercise_failed', message: e?.message || 'Unknown error' });
  }
}
