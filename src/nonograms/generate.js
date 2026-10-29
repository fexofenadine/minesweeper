import { random } from '../shell/random'
import { EMPTY, cluesOf, emptyBoard } from './rules'
import { deduce } from './solver'
import { levels, rate, solveAt } from './techniques'

export { random }

//a random picture: noise smoothed into blobs so it looks like shapes, mirrored half the time
//5x5 is too small to smooth, it would wash out to a few cells
//dense adds to the fill, easy boards want long runs that overlap a lot
export const makePicture = (n, rng, dense = 0) => {
  const density = 0.48 + dense + 0.08 * rng()
  let cells = Int8Array.from({ length: n * n }, () => (rng() < density ? 1 : 0))
  for (let pass = 0; pass < (n < 10 ? 0 : 2); pass++) {
    const next = cells.slice()
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        let count = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const yy = y + dy
            const xx = x + dx
            if (yy >= 0 && yy < n && xx >= 0 && xx < n) count += cells[yy * n + xx]
          }
        }
        //a clear majority of the neighbourhood wins, a close call keeps the cell
        if (count >= 6) next[y * n + x] = 1
        else if (count <= 3) next[y * n + x] = 0
      }
    }
    cells = next
  }
  if (rng() < 0.5) {
    for (let y = 0; y < n; y++) {
      for (let x = Math.ceil(n / 2); x < n; x++) cells[y * n + x] = cells[y * n + n - 1 - x]
    }
  }
  return cells
}

//a picture whose clues the techniques up to top can finish, which also proves it is the only answer
//a cell they can't settle gets flipped, changing the clues around it, and after too many flips
//it starts over with a new picture, giving up with null once the deadline passes
//what-if is slow over a mostly open board, so it waits until lines leave a quarter or less open
export const makePuzzle = (n, rng, top = levels.length - 1, deadline = Infinity) => {
  while (performance.now() < deadline) {
    const solution = makePicture(n, rng, top ? 0 : 0.12)
    for (let flips = 0; flips < 4 * n && performance.now() < deadline; flips++) {
      const clues = cluesOf(solution, n)
      const board = emptyBoard(n)
      if (solveAt(board, n, clues, Math.min(top, 2))) {
        return { solution, clues, level: rate(clues, n, Math.min(top, 2)) }
      }
      //lines alone got stuck, so a board what-if finishes is expert by definition
      const open = board.filter((v) => v === EMPTY).length
      if (top >= 3 && open * 4 <= n * n && deduce(board, n, clues, true, deadline) !== null) {
        return { solution, clues, level: 3 }
      }
      const unsettled = [...board.keys()].filter((i) => board[i] === EMPTY)
      solution[unsettled[Math.floor(rng() * unsettled.length)]] ^= 1
    }
  }
  return null
}

//a puzzle that needs exactly level, within a time budget, longer for the biggest boards
//falls back to the hardest board found when time runs out, or a quick medium one if none was
export const makeGame = (n, level, rng, budget = n >= 20 ? 3000 : 1500) => {
  const deadline = performance.now() + budget
  let best = null
  for (;;) {
    const puzzle = makePuzzle(n, rng, level, deadline)
    if (!puzzle) break
    if (puzzle.level === level) return puzzle
    if (!best || puzzle.level > best.level) best = puzzle
  }
  return best ?? makePuzzle(n, rng, 1)
}
