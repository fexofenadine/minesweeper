import { makeGame, random } from './generate'

self.onmessage = ({ data: { id, n, level, seed } }) => {
  const { givens, solution, level: got } = makeGame(n, level, random(seed))
  self.postMessage({ id, givens, solution, level: got }, [givens.buffer, solution.buffer])
}
