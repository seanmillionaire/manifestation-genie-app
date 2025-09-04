// /pages/api/exercise.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { buildExercisePack, pickToday } from '../../src/engine/exercises'
import { supabase } from '../../src/supabaseClient'

function dayKey(){ return new Date().toISOString().slice(0,10); }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { desire, blocker, asset, vibe = 'calm', persona = 'genie1', userId } = (req.body || {}) as {
      desire?: string; blocker?: string; asset?: string; vibe?: any; persona?: any; userId?: string;
    };
    if (!desire || !asset) {
      return res.status(400).json({ error: 'Missing inputs', need: { desire: true, asset: true } });
    }

    // Optional: enforce 1/day if userId present
    if (userId) {
      const { data: logs, error: selErr } = await supabase
        .from('exercise_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('date', dayKey());

      if (!selErr && logs && logs.length > 0) {
        return res.status(200).json({
          exercise: null,
          packCount: 0,
          dayKey: dayKey(),
          message: 'already_completed_today'
        });
      }
    }

    const pack = buildExercisePack({ desire, blocker: blocker || 'resistance', asset }, vibe, persona);
    const exercise = pickToday(pack, asset);

    // Optional: pre-log that we delivered today’s exercise (so repeated calls don’t show again)
    if (userId) {
      await supabase.from('exercise_logs').insert([
        { user_id: userId, exercise_id: 1, date: dayKey() }
      ]);
    }

    res.status(200).json({ exercise, packCount: pack.length, dayKey: dayKey() });
  } catch (e: any) {
    res.status(500).json({ error: 'exercise_failed', message: e?.message || 'Unknown error' });
  }
}
