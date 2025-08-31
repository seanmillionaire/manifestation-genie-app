import type { NextApiRequest, NextApiResponse } from 'next'
import { buildExercisePack, pickToday } from '../../src/engine/exercises'

export default function handler(req:NextApiRequest, res:NextApiResponse){
  const { desire, blocker, asset, vibe='calm', persona='genie1' } = req.body || {}
  if(!desire || !asset) return res.status(400).json({ error:'Missing inputs' })
  const pack = buildExercisePack({ desire, blocker: blocker||'resistance', asset }, vibe, persona)
  const exercise = pickToday(pack)
  res.json({ exercise, packCount: pack.length })
}
