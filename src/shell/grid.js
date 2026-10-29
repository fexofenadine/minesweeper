//square puzzle grids: n * n cells in row order, lines 0 to n - 1 are the rows, n to 2n - 1 the columns

const cellCache = {}

//the cell indexes of each line, rows then columns
export const cellsOf = (n) =>
  (cellCache[n] ??= Array.from({ length: 2 * n }, (_, line) =>
    Array.from({ length: n }, (_, k) => (line < n ? line * n + k : k * n + line - n)),
  ))

export const lineName = (line, n) => (line < n ? `row ${line + 1}` : `column ${line - n + 1}`)

export const capital = (text) => text[0].toUpperCase() + text.slice(1)
