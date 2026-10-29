import { dealer } from '../shell/deal'
import { makeGame, random } from './generate'

const dealOne = dealer(
  () => new Worker(new URL('./deal.worker.js', import.meta.url), { type: 'module' }),
  ({ n, level, seed }) => makeGame(n, level, random(seed)),
)

export const deal = (n, level, seed) => dealOne({ n, level, seed })
