import { CROSS, EMPTY, FILL, cellsOf, settleLine } from './rules'

//the exact solver behind generation and uniqueness checks
//each line settles what its clue allows, and a line that changed wakes the lines crossing it

//fills the board in place, false on a contradiction
//lines lists the lines to start from, every line unless the board was already settled
//trace, when given, is told the line that could no longer match
//settle works out one line, the full line logic unless the techniques limit it
export const propagate = (board, n, clues, lines = null, trace = null, settle = settleLine) => {
  const all = cellsOf(n)
  const waiting = new Uint8Array(2 * n)
  const queue = lines ?? all.map((_, line) => line)
  queue.forEach((line) => (waiting[line] = 1))
  while (queue.length) {
    const line = queue.pop()
    waiting[line] = 0
    const cells = all[line]
    const values = cells.map((i) => board[i])
    const settled = settle(values, clues[line])
    if (!settled) {
      if (trace) trace.line = line
      return false
    }
    for (let k = 0; k < n; k++) {
      if (values[k] !== EMPTY || settled[k] === EMPTY) continue
      board[cells[k]] = settled[k]
      const across = line < n ? n + k : k
      if (!waiting[across]) {
        waiting[across] = 1
        queue.push(across)
      }
    }
  }
  return true
}

//the two lines through a cell
export const linesThrough = (i, n) => [Math.floor(i / n), n + (i % n)]

//what-if: a value that leads the lines into a contradiction can't be right, so the cell takes the other
//returns { cell, value, line } with the line that broke, or null when no single guess fails
//or the deadline passes
export const contradiction = (board, n, clues, deadline = Infinity) => {
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== EMPTY) continue
    if (performance.now() > deadline) return null
    for (const v of [FILL, CROSS]) {
      const trial = board.slice()
      trial[i] = v
      const trace = {}
      if (!propagate(trial, n, clues, linesThrough(i, n), trace)) {
        return { cell: i, value: 1 - v, line: trace.line }
      }
    }
  }
  return null
}

//as far as logic goes, in place: line by line, then what-if when deep
//returns 0 when line logic was enough, 1 when what-if was needed, null when stuck or contradictory
//or out of time
export const deduce = (board, n, clues, deep = true, deadline = Infinity) => {
  if (!propagate(board, n, clues)) return null
  let level = 0
  while (board.includes(EMPTY)) {
    const found = deep && contradiction(board, n, clues, deadline)
    if (!found) return null
    level = 1
    board[found.cell] = found.value
    if (!propagate(board, n, clues, linesThrough(found.cell, n))) return null
  }
  return level
}

//how many solutions, counting no further than limit
export const countSolutions = (clues, n, limit = 2, board = new Int8Array(n * n).fill(EMPTY)) => {
  if (!propagate(board, n, clues)) return 0
  const i = board.indexOf(EMPTY)
  if (i < 0) return 1
  let total = 0
  for (const v of [FILL, CROSS]) {
    const branch = board.slice()
    branch[i] = v
    total += countSolutions(clues, n, limit - total, branch)
    if (total >= limit) break
  }
  return total
}
