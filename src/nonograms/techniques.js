import {
  CROSS,
  EMPTY,
  FILL,
  capital,
  cellsOf,
  emptyBoard,
  lineName,
  placements,
  runsOf,
  sameRuns,
  settleLine,
} from './rules'
import { contradiction, deduce, propagate } from './solver'

//the reasoning a person uses, easiest first, behind hints, difficulty and generation
//each level's finder looks at one line and returns steps with places along the line:
//{ technique, place: [[k, value]], sources: [k], text(name, ends) }
//a board's level is the hardest one it needs, and each level includes the ones before

export const levels = ['easy', 'medium', 'hard', 'expert']

const ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth']

const sum = (clue) => clue.reduce((a, b) => a + b, 0)
const range = (a, b) => Array.from({ length: Math.max(0, b - a) }, (_, i) => a + i)
const empties = (values, ks) => ks.filter((k) => values[k] === EMPTY)
const known = (values) => [...values.keys()].filter((k) => values[k] !== EMPTY)
const clueText = (clue) => (clue.length ? clue.join(' ') : '0')
const span = (a, b) => (a === b ? `cell ${a + 1}` : `cells ${a + 1} to ${b + 1}`)

//a run by its length, numbered when the clue has another run as long
const runName = (clue, j) => {
  const same = clue.filter((run) => run === clue[j]).length
  if (same === 1) return `the ${clue[j]}`
  const nth = clue.slice(0, j + 1).filter((run) => run === clue[j]).length - 1
  return `the ${ordinals[nth] ?? `number ${nth + 1}`} ${clue[j]}`
}

//what a step does to its cells, in words
const result = (place) => {
  const one = place.length === 1
  if (place.every(([, v]) => v === FILL))
    return one ? 'that cell is filled' : 'those cells are filled'
  if (place.every(([, v]) => v === CROSS))
    return one ? 'that cell is empty' : 'those cells are empty'
  return 'those cells are filled and emptied as shown'
}

//where each run can go, pushed as far one way and then the other
const extremes = (fit, clue, n) =>
  clue.map((run, j) => {
    let left = 0
    while (!fit.canStart(j, left)) left++
    let right = n - run
    while (!fit.canStart(j, right)) right--
    return { run, left, right }
  })

//each run pushed as far one way and then the other, from placements that may ignore the filled
//cells: the cells a run covers wherever it sits are filled, and cells no run reaches are empty
const pushed = (values, view, clue, [cover, gap], lead) => {
  const n = values.length
  const fit = placements(view, clue)
  if (!fit) return []
  const steps = []
  const reach = new Uint8Array(n)
  extremes(fit, clue, n).forEach(({ run, left, right }, j) => {
    for (let k = left; k < right + run; k++) reach[k] = 1
    const place = empties(values, range(right, left + run)).map((k) => [k, FILL])
    if (!place.length) return
    steps.push({
      technique: cover,
      place,
      sources: known(view),
      text: (name, [first, last]) =>
        left === right
          ? capital(
              `${lead}${runName(clue, j)} in ${name} only fits in ${span(left, left + run - 1)}, so ${result(place)}.`,
            )
          : capital(
              `${lead}${runName(clue, j)} in ${name} covers ${span(left, left + run - 1)} pushed as far ${first} as it goes and ${span(right, right + run - 1)} pushed as far ${last}. Wherever it sits it covers ${span(right, left + run - 1)}, so ${result(place)}.`,
            ),
    })
  })
  const place = empties(values, range(0, n))
    .filter((k) => !reach[k])
    .map((k) => [k, CROSS])
  if (place.length) {
    steps.push({
      technique: gap,
      place,
      sources: known(view),
      text: (name) =>
        capital(
          `${lead}no run of ${name}'s clue ${clueText(clue)} can reach ${place.length === 1 ? 'this cell' : 'these cells'}, so ${result(place)}.`,
        ),
    })
  }
  return steps
}

//easy: a clue that settles its line alone, a line with all its runs, simple overlaps and gaps
//no run can reach, counting only crossed out cells, which keeps them to what shows at a glance
const easy = (values, clue) => {
  const n = values.length
  const all = range(0, n)
  const whole = (place, sources, text) => [{ technique: 'complete', place, sources, text }]
  if (!clue.length) {
    return whole(
      empties(values, all).map((k) => [k, CROSS]),
      [],
      (name) => `${capital(name)}'s clue is 0, so every cell in it is empty.`,
    )
  }
  if (sum(clue) + clue.length - 1 === n) {
    const exact = clue.flatMap((run, j) => [...(j ? [CROSS] : []), ...Array(run).fill(FILL)])
    return whole(
      empties(values, all).map((k) => [k, exact[k]]),
      [],
      (name) =>
        `${capital(name)}'s clue ${clueText(clue)} needs all ${n} cells, its runs with one empty cell between each, so it fills the line exactly.`,
    )
  }
  if (sameRuns(runsOf(values), clue)) {
    return whole(
      empties(values, all).map((k) => [k, CROSS]),
      all.filter((k) => values[k] === FILL),
      (name) =>
        `${capital(name)} already has all its runs (${clueText(clue)}), so its other cells are empty.`,
    )
  }
  const view = values.map((v) => (v === FILL ? EMPTY : v))
  return pushed(values, view, clue, ['overlap', 'gap'], '')
}

//medium: the same, counting the filled cells too
const medium = (values, clue) =>
  pushed(values, values, clue, ['forcing', 'reach'], 'with the cells already known, ')

//hard: whatever every placement of the clue around the known cells agrees on
const hard = (values, clue) => {
  const settled = settleLine(values, clue)
  if (!settled) return []
  const place = empties(values, range(0, values.length))
    .filter((k) => settled[k] !== EMPTY)
    .map((k) => [k, settled[k]])
  if (!place.length) return []
  return [
    {
      technique: 'line',
      place,
      sources: known(values),
      text: (name) =>
        `Trying every way ${name}'s clue ${clueText(clue)} fits around its known cells, ${place.length === 1 ? 'this cell comes' : 'these cells come'} out the same in all of them, so ${result(place)}.`,
    },
  ]
}

const finders = [easy, medium, hard]

//one line's steps at one level, with text(name, ends) still to be filled in
export const lineSteps = (values, clue, level) => finders[level](values, clue)

//one line settled as far as the levels up to level go, or null when it can't match
//each level finds everything the ones before it do, so only its own finder runs
const settleUpTo = (level) => (values, clue) => {
  if (level >= 2) return settleLine(values, clue)
  const out = Int8Array.from(values)
  for (;;) {
    if (!placements(out, clue)) return null
    const place = finders[level](out, clue).flatMap((s) => s.place)
    if (!place.length) return out
    for (const [k, v] of place) out[k] = v
  }
}

//as far as the levels up to level go, in place, true when the board is finished
//expert's what-if trials use full line logic, as a person checking a guess would
export const solveAt = (board, n, clues, level, deadline = Infinity) => {
  if (!propagate(board, n, clues, null, null, settleUpTo(level))) return false
  if (!board.includes(EMPTY)) return true
  return level >= 3 && deduce(board, n, clues, true, deadline) !== null
}

//the easiest level that finishes a board from its clues alone, or null past top
export const rate = (clues, n, top = levels.length - 1) => {
  const board = emptyBoard(n)
  for (let level = 0; level <= top; level++) if (solveAt(board, n, clues, level)) return level
  return null
}

//the steps of the easiest level that has any, as board cells
//{ technique, level, line, place: [[cell, value]], sources: [cells], text }
export const nextSteps = (board, n, clues, top = levels.length - 1) => {
  const lines = cellsOf(n)
  for (let level = 0; level <= Math.min(top, 2); level++) {
    const steps = []
    lines.forEach((cells, line) => {
      const values = cells.map((i) => board[i])
      if (!values.includes(EMPTY)) return
      const name = lineName(line, n)
      const ends = line < n ? ['left', 'right'] : ['up', 'down']
      for (const found of finders[level](values, clues[line])) {
        steps.push({
          technique: found.technique,
          level,
          line,
          place: found.place.map(([k, v]) => [cells[k], v]),
          sources: found.sources.map((k) => cells[k]),
          text: found.text(name, ends),
        })
      }
    })
    if (steps.length) return { steps, level }
  }
  if (top >= 3) {
    const found = contradiction(board, n, clues)
    if (found) {
      const { cell, value, line } = found
      const tried = value === FILL ? 'empty' : 'filled'
      return {
        level: 3,
        steps: [
          {
            technique: 'what-if',
            level: 3,
            line,
            place: [[cell, value]],
            sources: [],
            text: `If this cell were ${tried}, following the lines from it would leave ${lineName(line, n)} unable to match its clue, so it must be ${value === FILL ? 'filled' : 'empty'}.`,
          },
        ],
      }
    }
  }
  return { steps: [], level: null }
}
