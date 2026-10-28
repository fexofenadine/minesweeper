import { expect, it } from 'vitest'
import { EMPTY, cellsOf, emptyBoard, linesOf, readLine, sizes, solved, violations } from './rules'
import { countSolutions, solve } from './solver'
import { makePuzzle, makeSolution, random } from './generate'

const parse = (rows) =>
  Int8Array.from(rows.join('').split(''), (c) => (c === '.' ? EMPTY : Number(c)))

it('lists every valid line for each size', () => {
  expect(sizes.map((n) => linesOf(n).length)).toEqual([14, 34, 84, 208, 518])
  for (const mask of linesOf(8)) {
    const bits = mask.toString(2).padStart(8, '0')
    expect(bits).not.toMatch(/000|111/)
    expect(bits.replace(/0/g, '')).toHaveLength(4)
  }
})

it('reads rows and columns as bitmasks', () => {
  const board = parse(['1.0.', '....', '0...', '....'])
  expect(readLine(board, cellsOf(4)[0])).toEqual({ known: 0b0101, value: 0b0001 })
  expect(readLine(board, cellsOf(4)[4])).toEqual({ known: 0b0101, value: 0b0001 })
})

it('finds cells that break a rule', () => {
  //three 1s in the top row, too many 0s in the first column
  const bad = violations(parse(['111...', '0.....', '0.....', '0.....', '0.....', '......']), 6)
  expect([...bad].sort((a, b) => a - b)).toEqual([0, 1, 2, 6, 12, 18, 24])
  const fine = parse(['101...', '0.....', '1.....', '0.....', '......', '......'])
  expect(violations(fine, 6).size).toBe(0)
})

it('finds repeated full rows but not a row matching a column', () => {
  const board = parse(['0101', '1010', '0101', '1010'])
  expect(violations(board, 4).size).toBe(16)
  expect(violations(parse(['0110', '1001', '0011', '1100']), 4).size).toBe(0)
})

//slow and simple, a row at a time, to check the line solver against
const bruteCount = (board, n) => {
  const rows = linesOf(n)
  const pick = []
  const fits = (mask, y) =>
    [...Array(n).keys()].every((x) => {
      const v = board[y * n + x]
      return v === EMPTY || v === ((mask >> x) & 1)
    })
  const go = (y) => {
    if (y === n) {
      const grid = Int8Array.from(
        { length: n * n },
        (_, i) => (pick[Math.floor(i / n)] >> (i % n)) & 1,
      )
      return solved(grid, n) ? 1 : 0
    }
    let total = 0
    for (const mask of rows) {
      if (!fits(mask, y) || pick.includes(mask)) continue
      pick[y] = mask
      total += go(y + 1)
    }
    pick.length = y
    return total
  }
  return go(0)
}

it('counts solutions the same as a brute force search', () => {
  const rng = random(7)
  for (let run = 0; run < 25; run++) {
    const board = makeSolution(6, rng)
    //blank about half the cells
    board.forEach((_, i) => rng() < 0.55 && (board[i] = EMPTY))
    expect(countSolutions(board, 6, 1000)).toBe(bruteCount(board, 6))
  }
})

it('solves to a board that keeps every rule', () => {
  for (const n of sizes) {
    const board = solve(emptyBoard(n), n)
    expect(solved(board, n)).toBe(true)
  }
})

it('makes random full boards of every size', () => {
  const rng = random(1)
  for (const n of sizes) {
    const a = makeSolution(n, rng)
    const b = makeSolution(n, rng)
    expect(solved(a, n) && solved(b, n)).toBe(true)
    expect(a).not.toEqual(b)
  }
})

it('deals the same puzzle from the same seed', () => {
  expect(makePuzzle(8, random(42)).givens).toEqual(makePuzzle(8, random(42)).givens)
})

it('deals puzzles with exactly one solution, the one it made', () => {
  for (const n of sizes) {
    for (let seed = 0; seed < (n < 12 ? 6 : 2); seed++) {
      const { givens, solution } = makePuzzle(n, random(seed))
      expect(countSolutions(givens, n, 2)).toBe(1)
      expect(solve(givens, n)).toEqual(solution)
      givens.forEach((v, i) => v !== EMPTY && expect(v).toBe(solution[i]))
      //minimal: taking away any clue allows a second solution
      const i = givens.findIndex((v) => v !== EMPTY)
      const fewer = givens.slice()
      fewer[i] = EMPTY
      expect(countSolutions(fewer, n, 2)).toBe(2)
    }
  }
})
