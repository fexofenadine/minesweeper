import { EMPTY, emptyBoard } from './rules'
import { countSolutions, solve } from './solver'

//seeded so a board can be dealt again from its number
export const random = (seed) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const shuffled = (list, rng) => {
  const copy = list.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

//a random full board that keeps every rule
export const makeSolution = (n, rng) => solve(emptyBoard(n), n, (list) => shuffled(list, rng))

//takes clues away in random order while the board keeps exactly one solution
//keep says whether a board is still acceptable, difficulty rating plugs in here later
export const makePuzzle = (n, rng, keep = (board) => countSolutions(board, n, 2) === 1) => {
  const solution = makeSolution(n, rng)
  const givens = solution.slice()
  for (const i of shuffled([...givens.keys()], rng)) {
    givens[i] = EMPTY
    if (!keep(givens)) givens[i] = solution[i]
  }
  return { givens, solution }
}
