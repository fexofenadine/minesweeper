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

export const lineName = (line, n) => (line < n ? `row ${line + 1}` : `column ${line - n + 1}`)

const capital = (text) => text[0].toUpperCase() + text.slice(1)

//each broken rule with its cells and a sentence: three alike in a row, too many of one value,
//or a full line repeated
export const breaks = (board, n) => {
  const found = []
  const lines = cellsOf(n)
  const done = new Map()
  lines.forEach((cells, line) => {
    const name = lineName(line, n)
    for (let k = 2; k < n; k++) {
      const v = board[cells[k]]
      if (v !== EMPTY && v === board[cells[k - 1]] && v === board[cells[k - 2]]) {
        found.push({
          cells: [cells[k - 2], cells[k - 1], cells[k]],
          text: `${capital(name)} has three ${v}s in a row.`,
        })
      }
    }
    for (const v of [0, 1]) {
      const same = cells.filter((i) => board[i] === v)
      if (same.length * 2 > n) {
        found.push({
          cells: same,
          text: `${capital(name)} has ${same.length} ${v}s, but only ${n / 2} fit in a line of ${n}.`,
        })
      }
    }
    const { known, value } = readLine(board, cells)
    if (known !== (1 << n) - 1) return
    //rows only repeat rows and columns only repeat columns
    const key = `${line < n ? 'r' : 'c'}${value}`
    if (done.has(key)) {
      const twin = done.get(key)
      found.push({
        cells: [...lines[twin], ...cells],
        text: `${capital(lineName(twin, n))} and ${name} are the same, and no two ${line < n ? 'rows' : 'columns'} may match.`,
      })
    } else {
      done.set(key, line)
    }
  })
  return found
}

export const violations = (board, n) => new Set(breaks(board, n).flatMap((b) => b.cells))

export const solved = (board, n) => full(board) && violations(board, n).size === 0
