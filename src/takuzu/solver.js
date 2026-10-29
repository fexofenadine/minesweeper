import { cellsOf, linesOf, readLine } from './rules'

//the exact solver behind uniqueness checks and generation, not the hints
//each line keeps the possible lines that still fit its cells, cells all of them agree on get filled

export const startCandidates = (n) => Array.from({ length: 2 * n }, () => linesOf(n))

//fills the board in place, returns the narrowed candidates or null on a contradiction
export const propagate = (board, n, candidates) => {
  const lines = cellsOf(n)
  const all = (1 << n) - 1
  const next = candidates.slice()
  let changed = true
  while (changed) {
    changed = false
    //full lines may not repeat, rows against rows and columns against columns
    const done = [new Set(), new Set()]
    for (let line = 0; line < 2 * n; line++) {
      const { known, value } = readLine(board, lines[line])
      if (known !== all) continue
      const seen = done[line < n ? 0 : 1]
      if (seen.has(value)) return null
      seen.add(value)
    }
    for (let line = 0; line < 2 * n; line++) {
      const cells = lines[line]
      const { known, value } = readLine(board, cells)
      if (known === all) {
        if (!next[line].includes(value)) return null
        next[line] = [value]
        continue
      }
      const seen = done[line < n ? 0 : 1]
      const fits = next[line].filter((mask) => (mask & known) === value && !seen.has(mask))
      if (!fits.length) return null
      next[line] = fits
      let ones = all
      let any = 0
      for (const mask of fits) {
        ones &= mask
        any |= mask
      }
      const fill = (ones | ~any) & all & ~known
      if (!fill) continue
      for (let k = 0; k < n; k++) {
        if ((fill >> k) & 1) board[cells[k]] = (ones >> k) & 1
      }
      changed = true
    }
  }
  return next
}

//tries each candidate of the line with the fewest, so a branch fills a whole line
//budget.left counts down the searches allowed, running out gives up
const search = (board, n, candidates, limit, order, found, budget) => {
  if (--budget.left < 0) return 0
  const narrowed = propagate(board, n, candidates)
  if (!narrowed) return 0
  let pick = -1
  for (let line = 0; line < 2 * n; line++) {
    const count = narrowed[line].length
    if (count > 1 && (pick < 0 || count < narrowed[pick].length)) pick = line
  }
  if (pick < 0) {
    found.push(board)
    return 1
  }
  const cells = cellsOf(n)[pick]
  let total = 0
  for (const mask of order(narrowed[pick])) {
    const copy = board.slice()
    cells.forEach((i, k) => (copy[i] = (mask >> k) & 1))
    const branch = narrowed.slice()
    branch[pick] = [mask]
    total += search(copy, n, branch, limit - total, order, found, budget)
    if (total >= limit) break
  }
  return total
}

const asIs = (list) => list

//how many solutions, counting no further than limit
export const countSolutions = (board, n, limit = 2) =>
  search(board.slice(), n, startCandidates(n), limit, asIs, [], { left: Infinity })

//the first solution found, or null; shuffle orders the branches for random boards
//and tries caps the searches, giving up with null so a random search can start over
export const solve = (board, n, shuffle = asIs, tries = Infinity) => {
  const found = []
  search(board.slice(), n, startCandidates(n), 1, shuffle, found, { left: tries })
  return found[0] ?? null
}
