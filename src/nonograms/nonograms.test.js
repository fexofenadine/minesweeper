import { expect, it } from 'vitest'
import {
  CROSS,
  EMPTY,
  FILL,
  breaks,
  cellsOf,
  cluesOf,
  emptyBoard,
  runsOf,
  settleLine,
  sizes,
  solved,
} from './rules'
import { countSolutions, deduce, propagate } from './solver'
import { makeGame, makePicture, makePuzzle, random } from './generate'
import { levels, lineSteps, rate, solveAt } from './techniques'
import { findHint } from './hint'
import { allowed } from './Menu'

//a line or board from text: . empty, x crossed, # filled
const read = (text) =>
  Int8Array.from(text.replace(/\s/g, ''), (c) => (c === '.' ? EMPTY : c === '#' ? FILL : CROSS))
const show = (values) =>
  [...values].map((v) => (v === EMPTY ? '.' : v === FILL ? '#' : 'x')).join('')

it('reads the runs of a line', () => {
  expect(runsOf(read('##x#.###'))).toEqual([2, 1, 3])
  expect(runsOf(read('xx..x'))).toEqual([])
  expect(cluesOf(read('##x x#x #x#'), 3)).toEqual([[2], [1], [1, 1], [1, 1], [2], [1]])
})

it('settles what a clue allows', () => {
  expect(show(settleLine(read('..........'), [8]))).toBe('..######..')
  expect(show(settleLine(read('.....'), []))).toBe('xxxxx')
  expect(show(settleLine(read('.....'), [5]))).toBe('#####')
  expect(show(settleLine(read('...'), [1, 1]))).toBe('#x#')
  expect(show(settleLine(read('#.........'), [3, 2]))).toBe('###x......')
  expect(show(settleLine(read('....#.....'), [1]))).toBe('xxxx#xxxxx')
  expect(settleLine(read('xxxxx'), [3])).toBe(null)
  expect(settleLine(read('##.##'), [4])).toBe(null)
})

//every line of length n that matches the clue and the known cells, the slow way
const brute = (values, clue) => {
  const n = values.length
  const fits = []
  for (let mask = 0; mask < 1 << n; mask++) {
    const line = Array.from({ length: n }, (_, k) => (mask >> k) & 1)
    if (line.some((v, k) => values[k] !== EMPTY && values[k] !== v)) continue
    const runs = runsOf(line)
    if (runs.length === clue.length && runs.every((r, k) => r === clue[k])) fits.push(line)
  }
  if (!fits.length) return null
  return Int8Array.from(values, (v, k) => {
    if (v !== EMPTY) return v
    const first = fits[0][k]
    return fits.every((line) => line[k] === first) ? first : EMPTY
  })
}

it('agrees with trying every line on thousands of random cases', () => {
  const rng = random(7)
  for (let t = 0; t < 4000; t++) {
    const n = 1 + Math.floor(rng() * 10)
    const picture = Array.from({ length: n }, () => (rng() < 0.55 ? 1 : 0))
    //clues from a real line half the time, otherwise random ones that may not fit
    const clue =
      rng() < 0.5
        ? runsOf(picture)
        : Array.from({ length: Math.floor(rng() * 3) }, () => 1 + Math.floor(rng() * 4))
    const values = Int8Array.from(picture, (v) => (rng() < 0.3 ? v : EMPTY))
    if (rng() < 0.2) values[Math.floor(rng() * n)] = rng() < 0.5 ? FILL : CROSS
    const got = settleLine(values, clue)
    const want = brute(values, clue)
    expect(got && show(got), `${show(values)} ${clue}`).toBe(want && show(want))
  }
})

it('solves a small board line by line', () => {
  //a plus sign
  const solution = read('..#.. ..#.. ##### ..#.. ..#..'.replace(/\./g, 'x'))
  const clues = cluesOf(solution, 5)
  const board = emptyBoard(5)
  expect(propagate(board, 5, clues)).toBe(true)
  expect(show(board)).toBe(show(solution))
  expect(solved(board, 5, clues)).toBe(true)
})

it('needs what-if where lines alone get stuck, and counts more than one answer', () => {
  //two diagonals of a 2x2 both fit 1 1 / 1 1, so neither logic nor counting can pick one
  const clues = cluesOf(read('#x x#'), 2)
  expect(deduce(emptyBoard(2), 2, clues)).toBe(null)
  expect(countSolutions(clues, 2)).toBe(2)
})

it('wins on matching clues whether or not the empty cells are crossed', () => {
  const solution = read('#x# x#x #x#')
  const clues = cluesOf(solution, 3)
  expect(solved(read('#.# .#. #.#'), 3, clues)).toBe(true)
  expect(solved(read('#.# .#. #..'), 3, clues)).toBe(false)
})

it('points out a line that can no longer match its clue', () => {
  const clues = cluesOf(read('##x xxx xx#'), 3)
  const found = breaks(read('### ... ...'), 3, clues)
  expect(found).toHaveLength(1)
  expect(found[0].text).toBe("Row 1 can't match its clue 2 any more.")
  expect(found[0]).toMatchObject({ line: 0, cells: cellsOf(3)[0] })
})

it('draws pictures with shapes rather than static', () => {
  const picture = makePicture(20, random(3))
  const filled = picture.reduce((a, b) => a + b, 0)
  expect(filled / 400).toBeGreaterThan(0.3)
  expect(filled / 400).toBeLessThan(0.8)
  //smoothing leaves far fewer lone cells than noise would
  let lone = 0
  for (let i = 0; i < 400; i++) {
    const x = i % 20
    const sides = [i - 20, i + 20, x ? i - 1 : -1, x < 19 ? i + 1 : -1].filter(
      (j) => j >= 0 && j < 400,
    )
    if (sides.every((j) => picture[j] !== picture[i])) lone++
  }
  expect(lone).toBeLessThan(20)
})

it('deals every size at every level it allows, needing exactly that level', () => {
  for (const n of sizes) {
    for (let level = 0; level < levels.length; level++) {
      if (!allowed(n, level)) continue
      const { solution, clues, level: got } = makeGame(n, level, random(n * 10 + level), 30000)
      expect(got).toBe(level)
      expect(cluesOf(solution, n)).toEqual(clues)
      expect(rate(clues, n)).toBe(level)
      const board = emptyBoard(n)
      expect(solveAt(board, n, clues, level)).toBe(true)
      expect(show(board)).toBe(show(Int8Array.from(solution, (v) => (v ? FILL : CROSS))))
      if (n <= 10) expect(countSolutions(clues, n)).toBe(1)
    }
  }
}, 60000)

it('gives up on a picture lines barely open instead of trying what-if everywhere', () => {
  //this 25x25 seed took 50 s when what-if ran over a board lines had left almost all open
  const started = performance.now()
  expect(makePuzzle(25, random(9048))).toBeTruthy()
  expect(performance.now() - started).toBeLessThan(3000)
})

it('keeps to its time budget, falling back to a quick board', () => {
  const started = performance.now()
  const { level } = makeGame(25, 3, random(4), 50)
  expect(performance.now() - started).toBeLessThan(2000)
  expect(level).toBeLessThanOrEqual(3)
})

const rowSteps = (text, clue, level) =>
  lineSteps(read(text), clue, level).map((step) => ({
    ...step,
    text: step.text('row 1', ['left', 'right']),
  }))

it('fills a line a clue settles alone, and empties one that has all its runs', () => {
  const [exact] = rowSteps('.....', [2, 2], 0)
  expect(exact.technique).toBe('complete')
  expect(exact.place.map(([, v]) => v)).toEqual([FILL, FILL, CROSS, FILL, FILL])
  const [done] = rowSteps('.##..', [2], 0)
  expect(done.text).toBe('Row 1 already has all its runs (2), so its other cells are empty.')
  expect(done.place).toEqual([
    [0, CROSS],
    [3, CROSS],
    [4, CROSS],
  ])
})

it('explains an overlap, and leaves the filled cells out of it at easy', () => {
  const [step] = rowSteps('..........', [7], 0)
  expect(step.technique).toBe('overlap')
  expect(step.place.map(([k]) => k)).toEqual([3, 4, 5, 6])
  expect(step.text).toBe(
    'The 7 in row 1 covers cells 1 to 7 pushed as far left as it goes and cells 4 to 10 pushed as far right. Wherever it sits it covers cells 4 to 7, so those cells are filled.',
  )
  const [fixed] = rowSteps('xxx.......', [7], 0)
  expect(fixed.text).toBe('The 7 in row 1 only fits in cells 4 to 10, so those cells are filled.')
  //a filled cell pins the 3 near the start, but easy only counts crossed out cells
  expect(rowSteps('.#........', [3], 0)).toEqual([])
})

it('uses the filled cells at medium to pin a run and empty what it cannot reach', () => {
  const steps = rowSteps('.#........', [3], 1)
  expect(steps.map((s) => s.technique)).toEqual(['forcing', 'reach'])
  expect(steps[0].place.map(([k]) => k)).toEqual([2])
  expect(steps[1].place.map(([k]) => k)).toEqual([4, 5, 6, 7, 8, 9])
  expect(steps[1].text).toMatch(/^With the cells already known, no run of row 1's clue 3 can reach/)
})

it('leaves what only every placement together shows to hard', () => {
  //with clue 1 1 the filled cell is one of the 1s, so its neighbours are empty,
  //but no single run is pinned enough for medium to say so
  expect(rowSteps('.....#..', [1, 1], 1)).toEqual([])
  const [step] = rowSteps('.....#..', [1, 1], 2)
  expect(step.technique).toBe('line')
  expect(step.place).toEqual([
    [4, CROSS],
    [6, CROSS],
  ])
  expect(step.text).toBe(
    "Trying every way row 1's clue 1 1 fits around its known cells, these cells come out the same in all of them, so those cells are empty.",
  )
})

it('finishes boards by following hints alone, every hint agreeing with the solution', () => {
  const kinds = new Set()
  for (const [n, level] of [
    [5, 0],
    [10, 1],
    [10, 2],
    [10, 3],
    [15, 3],
  ]) {
    for (let seed = 0; seed < 2; seed++) {
      const { solution, clues } = makeGame(n, level, random(seed + 40))
      const board = emptyBoard(n)
      for (let guard = 0; guard < n * n; guard++) {
        const hint = findHint({ board, solution, clues, n })
        if (hint.kind === 'solved') break
        kinds.add(hint.kind)
        expect(hint.place.length).toBeGreaterThan(0)
        for (const [i, v] of hint.place) {
          expect(v).toBe(solution[i] ? FILL : CROSS)
          board[i] = v
        }
      }
      expect(solved(board, n, clues)).toBe(true)
    }
  }
  for (const kind of ['complete', 'overlap', 'forcing', 'reach', 'line', 'what-if']) {
    expect(kinds).toContain(kind)
  }
}, 60000)

it('points at the cells that are really wrong in a broken line', () => {
  const solution = read('##xxx' + 'x'.repeat(20))
  const clues = cluesOf(solution, 5)
  //row 1 should be ## and has ### instead
  const board = emptyBoard(5)
  board.set(read('###'), 0)
  const hint = findHint({ board, solution, clues, n: 5 })
  expect(hint).toMatchObject({
    kind: 'break',
    line: 0,
    marks: { 0: 'source', 1: 'source', 2: 'wrong' },
  })
  expect(hint.text).toMatch(/The cell outlined in red is the one to change/)
  //a wrong cell that breaks nothing yet is called out on its own
  const quiet = emptyBoard(5)
  quiet[24] = CROSS
  quiet[0] = CROSS
  expect(findHint({ board: quiet, solution, clues, n: 5 })).toMatchObject({
    kind: 'wrong',
    marks: { 0: 'wrong' },
  })
})
