//a board is n * n cells in row order, each -1 (empty), 0 or 1
//lines 0 to n - 1 are the rows, n to 2n - 1 the columns, a line's bit k is its kth cell

export const EMPTY = -1

export const sizes = [6, 8, 10, 12, 14]

const lineCache = {}
const cellCache = {}

//every possible line: as many 0s as 1s and never three alike in a row
export const linesOf = (n) =>
  (lineCache[n] ??= Array.from({ length: 1 << n }, (_, mask) => mask).filter((mask) => {
    let ones = 0
    for (let k = 0; k < n; k++) {
      ones += (mask >> k) & 1
      if (k >= 2) {
        const run = (mask >> (k - 2)) & 7
        if (run === 0 || run === 7) return false
      }
    }
    return ones * 2 === n
  }))

//the cell indexes of each line, rows then columns
export const cellsOf = (n) =>
  (cellCache[n] ??= Array.from({ length: 2 * n }, (_, line) =>
    Array.from({ length: n }, (_, k) => (line < n ? line * n + k : k * n + line - n)),
  ))

//which cells of a line are filled, and which of those are 1
export const readLine = (board, cells) => {
  let known = 0
  let value = 0
  for (let k = 0; k < cells.length; k++) {
    const v = board[cells[k]]
    if (v !== EMPTY) {
      known |= 1 << k
      if (v) value |= 1 << k
    }
  }
  return { known, value }
}

export const emptyBoard = (n) => new Int8Array(n * n).fill(EMPTY)

export const full = (board) => !board.includes(EMPTY)

//cells breaking a rule: three alike in a row, too many of one value, or a repeated full line
export const violations = (board, n) => {
  const bad = new Set()
  const lines = cellsOf(n)
  const done = new Map()
  lines.forEach((cells, line) => {
    for (let k = 2; k < n; k++) {
      const v = board[cells[k]]
      if (v !== EMPTY && v === board[cells[k - 1]] && v === board[cells[k - 2]]) {
        bad
          .add(cells[k])
          .add(cells[k - 1])
          .add(cells[k - 2])
      }
    }
    for (const v of [0, 1]) {
      const same = cells.filter((i) => board[i] === v)
      if (same.length * 2 > n) same.forEach((i) => bad.add(i))
    }
    const { known, value } = readLine(board, cells)
    if (known !== (1 << n) - 1) return
    //rows only repeat rows and columns only repeat columns
    const key = `${line < n ? 'r' : 'c'}${value}`
    if (done.has(key)) {
      cells.forEach((i) => bad.add(i))
      lines[done.get(key)].forEach((i) => bad.add(i))
    } else {
      done.set(key, line)
    }
  })
  return bad
}

export const solved = (board, n) => full(board) && violations(board, n).size === 0
