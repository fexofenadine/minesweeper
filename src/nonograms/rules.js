import { capital, cellsOf, lineName } from '../shell/grid'

//a board is n * n cells in row order, each -1 (empty), 0 (crossed out) or 1 (filled)
//a solution is the same with only 0s and 1s, and a clue is a line's run lengths of 1s in order

export { capital, cellsOf, lineName }

export const EMPTY = -1
export const CROSS = 0
export const FILL = 1

export const sizes = [5, 10, 15, 20, 25]

export const emptyBoard = (n) => new Int8Array(n * n).fill(EMPTY)

//the lengths of the runs of filled cells, an empty line has none
export const runsOf = (values) => {
  const runs = []
  let run = 0
  for (const v of values) {
    if (v === FILL) {
      run++
    } else if (run) {
      runs.push(run)
      run = 0
    }
  }
  if (run) runs.push(run)
  return runs
}

export const sameRuns = (a, b) => a.length === b.length && a.every((run, k) => run === b[k])

//every row's clue then every column's
export const cluesOf = (solution, n) =>
  cellsOf(n).map((cells) => runsOf(cells.map((i) => solution[i])))

//a line matches its clue once its filled cells make exactly those runs, crosses are never needed
export const lineDone = (board, cells, clue) => sameRuns(runsOf(cells.map((i) => board[i])), clue)

export const solved = (board, n, clues) =>
  cellsOf(n).every((cells, line) => lineDone(board, cells, clues[line]))

//every way to place a clue's runs that fits the cells known so far, or null when none fit
//before[j][i] says the first j runs fit in cells 0 to i - 1, after[j][i] that runs j on fit from cell i
//so it takes time in proportion to cells times runs, where listing the placements could take millions
//canStart(j, s) says some placement of the whole clue puts run j at cell s
export const placements = (values, clue) => {
  const n = values.length
  const k = clue.length
  const filled = new Int32Array(n + 1)
  const crossed = new Int32Array(n + 1)
  for (let i = 0; i < n; i++) {
    filled[i + 1] = filled[i] + (values[i] === FILL)
    crossed[i + 1] = crossed[i] + (values[i] === CROSS)
  }
  //cells a to b - 1 can all be crossed, or can all be filled
  const clear = (a, b) => filled[b] === filled[a]
  const solid = (a, b) => crossed[b] === crossed[a]
  const gap = (i) => values[i] !== FILL
  const before = Array.from({ length: k + 1 }, () => new Uint8Array(n + 1))
  for (let i = 0; i <= n; i++) before[0][i] = clear(0, i)
  for (let j = 1; j <= k; j++) {
    const run = clue[j - 1]
    for (let i = 1; i <= n; i++) {
      const s = i - run
      before[j][i] =
        (gap(i - 1) && before[j][i - 1]) ||
        (s >= 0 &&
          solid(s, i) &&
          (j === 1 ? before[0][s] : s >= 1 && gap(s - 1) && before[j - 1][s - 1]))
    }
  }
  if (!before[k][n]) return null
  const after = Array.from({ length: k + 1 }, () => new Uint8Array(n + 1))
  for (let i = 0; i <= n; i++) after[k][i] = clear(i, n)
  for (let j = k - 1; j >= 0; j--) {
    const run = clue[j]
    for (let i = n - 1; i >= 0; i--) {
      const e = i + run
      after[j][i] =
        (gap(i) && after[j][i + 1]) ||
        (e <= n &&
          solid(i, e) &&
          (j === k - 1 ? after[k][e] : e < n && gap(e) && after[j + 1][e + 1]))
    }
  }
  const canStart = (j, s) => {
    const e = s + clue[j]
    if (s < 0 || e > n || !solid(s, e)) return false
    const start = j === 0 ? before[0][s] : s >= 1 && gap(s - 1) && before[j][s - 1]
    const end = j === k - 1 ? after[k][e] : e < n && gap(e) && after[j + 1][e + 1]
    return Boolean(start && end)
  }
  //a cell can be crossed when it can sit between runs j - 1 and j
  const canCross = (c) => {
    if (!gap(c)) return false
    for (let j = 0; j <= k; j++) if (before[j][c] && after[j][c + 1]) return true
    return false
  }
  return { canStart, canCross }
}

//the line with each cell every placement agrees on filled in, or null when none fit
export const settleLine = (values, clue) => {
  const fit = placements(values, clue)
  if (!fit) return null
  const n = values.length
  //a cell can be filled when some run can sit over it, counted with a running difference
  const cover = new Int32Array(n + 1)
  clue.forEach((run, j) => {
    for (let s = 0; s + run <= n; s++) {
      if (!fit.canStart(j, s)) continue
      cover[s]++
      cover[s + run]--
    }
  })
  const out = Int8Array.from(values)
  let over = 0
  for (let c = 0; c < n; c++) {
    over += cover[c]
    if (out[c] !== EMPTY) continue
    if (!fit.canCross(c)) out[c] = FILL
    else if (!over) out[c] = CROSS
  }
  return out
}

//each line whose cells can no longer match its clue, with its cells and a sentence
export const breaks = (board, n, clues) => {
  const found = []
  cellsOf(n).forEach((cells, line) => {
    const values = cells.map((i) => board[i])
    if (settleLine(values, clues[line])) return
    const clue = clues[line].length ? clues[line].join(' ') : '0'
    found.push({
      line,
      cells,
      text: `${capital(lineName(line, n))} can't match its clue ${clue} any more.`,
    })
  })
  return found
}

export const violations = (board, n, clues) =>
  new Set(breaks(board, n, clues).flatMap((b) => b.cells))

//the cells the clues fill, against the cells filled so far
export const fillsLeft = (board, n, clues) =>
  clues
    .slice(0, n)
    .flat()
    .reduce((a, b) => a + b, 0) - board.filter((v) => v === FILL).length
