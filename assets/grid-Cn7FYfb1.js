//#region src/shell/grid.js?raw
var grid_default = "//square puzzle grids: n * n cells in row order, lines 0 to n - 1 are the rows, n to 2n - 1 the columns\n\nconst cellCache = {}\n\n//the cell indexes of each line, rows then columns\nexport const cellsOf = (n) =>\n  (cellCache[n] ??= Array.from({ length: 2 * n }, (_, line) =>\n    Array.from({ length: n }, (_, k) => (line < n ? line * n + k : k * n + line - n)),\n  ))\n\nexport const lineName = (line, n) => (line < n ? `row ${line + 1}` : `column ${line - n + 1}`)\n\nexport const capital = (text) => text[0].toUpperCase() + text.slice(1)\n";
//#endregion
export { grid_default as default };
