import { expect, it } from 'vitest'
import { EMPTY, cellsOf, emptyBoard, linesOf, readLine, sizes, solved, violations } from './rules'
import { countSolutions, propagate, solve, startCandidates } from './solver'
import { levels, nextSteps, oneLeft, rate, repeats, twins } from './techniques'
import { allowed } from './Menu'
import { makeGame, makePuzzle, makeSolution, random } from './generate'
import { completeWithErrors, findHint } from './hint'

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

it('fills the same cells with every technique up to hard as line propagation does', () => {
  const rng = random(3)
  for (let run = 0; run < 40; run++) {
    const n = sizes[run % 4]
    const board = makeSolution(n, rng)
    board.forEach((_, i) => rng() < 0.7 && (board[i] = EMPTY))
    const ladder = board.slice()
    let broken = false
    for (;;) {
      const { contradiction, steps } = nextSteps(ladder, n, 3)
      if (contradiction) broken = true
      if (contradiction || !steps.length) break
      steps.forEach(({ place }) => place.forEach(([i, v]) => (ladder[i] = v)))
    }
    const lines = board.slice()
    const narrowed = propagate(lines, n, startCandidates(n))
    expect(broken).toBe(false)
    expect(narrowed).not.toBe(null)
    expect(ladder).toEqual(lines)
  }
})

const hintFor = (rows, solution = null) => {
  const board = parse(rows)
  const n = rows.length
  return findHint({ board, solution: solution ?? solve(board, n), n })
}

it('hints a pair, a gap and a full count with their reasoning cells', () => {
  const pair = hintFor(['11....', '......', '......', '......', '......', '......'])
  expect(pair).toMatchObject({
    kind: 'pair',
    place: [[2, 0]],
    marks: { 0: 'source', 1: 'source', 2: 'zero' },
  })
  expect(pair.text).toMatch(/row 1/)
  const gap = hintFor(['1.1...', '......', '......', '......', '......', '......'])
  expect(gap).toMatchObject({ kind: 'gap', place: [[1, 0]] })
  const count = hintFor(['1010.1', '......', '......', '......', '......', '......'])
  expect(count).toMatchObject({ kind: 'count', place: [[4, 0]] })
  expect(count.text).toMatch(/Row 1 already has all 3 of its 1s/)
})

it('rules out a line that would repeat a full one', () => {
  const [step] = repeats(parse(['0101', '01..', '....', '....']), 4)
  expect(step.place).toEqual([
    [6, 1],
    [7, 0],
  ])
  expect(step.text).toMatch(/Row 2 could otherwise end up the same as row 1/)
})

it('points out a broken rule before anything else', () => {
  const rows = ['111...', '......', '......', '......', '......', '......']
  const hint = findHint({ board: parse(rows), solution: makeSolution(6, random(1)), n: 6 })
  expect(hint).toMatchObject({ kind: 'break', marks: { 0: 'wrong', 1: 'wrong', 2: 'wrong' } })
  expect(hint.text).toMatch(/Row 1 has three 1s in a row/)
  expect(completeWithErrors).toMatch(/complete but there are errors/)
})

it('marks a cell that breaks no rule yet but does not fit the solution', () => {
  const { givens, solution } = makeGame(8, 1, random(9))
  const board = givens.slice()
  const i = board.indexOf(EMPTY)
  board[i] = 1 - solution[i]
  const hint = findHint({ board, solution, n: 8 })
  //either it already breaks a rule or it is called out as not fitting
  expect(['break', 'wrong']).toContain(hint.kind)
  if (hint.kind === 'wrong') expect(hint.marks).toEqual({ [i]: 'wrong' })
})

it('deals every size at every level, needing exactly that level', () => {
  for (const n of sizes) {
    for (let level = 0; level < levels.length; level++) {
      if (!allowed(n, level)) continue
      const { givens, solution, level: got } = makeGame(n, level, random(n * 10 + level))
      expect(got).toBe(level)
      expect(rate(givens, n).level).toBe(level)
      if (level) expect(rate(givens, n, level - 1)).toBe(null)
      expect(countSolutions(givens, n, 2)).toBe(1)
      expect(rate(givens, n).solution).toEqual(solution)
    }
  }
})

it('finishes boards by following hints alone, every hint agreeing with the solution', () => {
  const kinds = new Set()
  for (const [n, level] of [
    [6, 0],
    [8, 1],
    [8, 2],
    [10, 3],
    [10, 4],
    [12, 4],
  ]) {
    for (let seed = 0; seed < 3; seed++) {
      const { givens, solution } = makeGame(n, level, random(seed + 100))
      const board = givens.slice()
      for (let guard = 0; guard < n * n; guard++) {
        const hint = findHint({ board, solution, n })
        if (hint.kind === 'solved') break
        kinds.add(hint.kind)
        expect(hint.place.length).toBeGreaterThan(0)
        for (const [i, v] of hint.place) {
          expect(v).toBe(solution[i])
          board[i] = v
        }
      }
      expect(solved(board, n)).toBe(true)
    }
  }
  for (const kind of ['pair', 'gap', 'count', 'one-left', 'balance', 'what-if']) {
    expect(kinds).toContain(kind)
  }
  expect(kinds).not.toContain('reveal')
})

it('rules out spots for the last one of a value that would leave three alike', () => {
  //row 1 needs one more 1, and in the 2nd or 5th cell it would leave three 0s together
  const [step] = oneLeft(parse(['1.0..1', '......', '......', '......', '......', '......']), 6)
  expect(step).toMatchObject({ technique: 'one-left', level: 2 })
  expect(step.place).toEqual([
    [1, 0],
    [4, 0],
  ])
  expect(step.text).toMatch(/Row 1 needs just one more 1, and in any of these cells/)
})

it('turns a line two cells short of a full one the other way round', () => {
  const [step] = twins(parse(['0110', '01..', '....', '....']), 4)
  expect(step.place).toEqual([
    [6, 0],
    [7, 1],
  ])
  expect(step.level).toBe(2)
  expect(step.text).toMatch(/Row 2 matches row 1 except for these two cells/)
})

it('never gets stuck building a random board', () => {
  //these seeds once sent the random search into dead ends lasting over a second and over a minute
  for (const [n, seed] of [
    [12, 707],
    [14, 387],
  ]) {
    const started = performance.now()
    expect(solved(makeSolution(n, random(seed)), n)).toBe(true)
    expect(performance.now() - started).toBeLessThan(500)
  }
})
