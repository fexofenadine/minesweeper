import { makeGame, random } from './generate'

self.onmessage = ({ data: { id, n, level, seed } }) => {
  const { solution, clues, level: got } = makeGame(n, level, random(seed))
  self.postMessage({ id, solution, clues, level: got }, [solution.buffer])
}
