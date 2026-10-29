import { EMPTY, cellsOf, full, lineName as nameOf, linesOf, readLine, violations } from './rules'
import { propagate, startCandidates } from './solver'

//the reasoning a person uses, easiest first, behind hints, difficulty and generation
//a step is { technique, level, place: [[cell, value]], sources: [cells], text }

export const levels = ['easy', 'medium', 'tricky', 'hard', 'expert']

const capital = (text) => text[0].toUpperCase() + text.slice(1)
const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven']
const many = (count, v) => `${words[count]} ${v}${count === 1 ? '' : 's'}`

//what a step puts where, in words
const result = (place) => {
  if (place.length === 1) return `this cell must be a ${place[0][1]}`
  const v = place[0][1]
  if (place.every((p) => p[1] === v)) return `these cells must all be ${v}s`
  return 'these cells must be filled as highlighted'
}

const step = (technique, level, place, sources, text) => ({
  technique,
  level,
  place,
  sources,
  text,
})

//two alike side by side need the other value on both sides
export const pairs = (board, n) => {
  const steps = []
  cellsOf(n).forEach((cells, line) => {
    for (let k = 0; k + 1 < n; k++) {
      const v = board[cells[k]]
      if (v === EMPTY || v !== board[cells[k + 1]]) continue
      for (const j of [k - 1, k + 2]) {
        if (j < 0 || j >= n || board[cells[j]] !== EMPTY) continue
        steps.push(
          step(
            'pair',
            0,
            [[cells[j], 1 - v]],
            [cells[k], cells[k + 1]],
            `Two ${v}s side by side in ${nameOf(line, n)} can't have a third ${v} next to them, so this cell is a ${1 - v}.`,
          ),
        )
      }
    }
  })
  return steps
}

//a gap between two alike takes the other value
export const gaps = (board, n) => {
  const steps = []
  cellsOf(n).forEach((cells, line) => {
    for (let k = 0; k + 2 < n; k++) {
      const v = board[cells[k]]
      if (v === EMPTY || v !== board[cells[k + 2]] || board[cells[k + 1]] !== EMPTY) continue
      steps.push(
        step(
          'gap',
          0,
          [[cells[k + 1], 1 - v]],
          [cells[k], cells[k + 2]],
          `The gap between two ${v}s in ${nameOf(line, n)} would make three in a row as a ${v}, so it is a ${1 - v}.`,
        ),
      )
    }
  })
  return steps
}

//a line with all its 0s or all its 1s fills the rest with the other value
export const counts = (board, n) => {
  const steps = []
  cellsOf(n).forEach((cells, line) => {
    const empty = cells.filter((i) => board[i] === EMPTY)
    if (!empty.length) return
    for (const v of [0, 1]) {
      const same = cells.filter((i) => board[i] === v)
      if (same.length * 2 !== n) continue
      const place = empty.map((i) => [i, 1 - v])
      steps.push(
        step(
          'count',
          1,
          place,
          same,
          `${capital(nameOf(line, n))} already has all ${n / 2} of its ${v}s, so ${result(place)}.`,
        ),
      )
    }
  })
  return steps
}

//a line needing just one more of a value: every spot where it would leave three alike is ruled out
export const oneLeft = (board, n) => {
  const steps = []
  cellsOf(n).forEach((cells, line) => {
    const empty = cells.filter((i) => board[i] === EMPTY)
    if (empty.length < 2) return
    for (const v of [0, 1]) {
      if (n / 2 - cells.filter((i) => board[i] === v).length !== 1) continue
      //try the last v in each empty cell with the other value everywhere else
      const blocked = empty.filter((spot) => {
        const trial = cells.map((i) => (i === spot ? v : board[i] === EMPTY ? 1 - v : board[i]))
        return trial.some((x, k) => k >= 2 && x === trial[k - 1] && x === trial[k - 2])
      })
      if (!blocked.length) continue
      if (blocked.length === empty.length) {
        steps.push({ contradiction: true })
        return
      }
      const place = blocked.map((i) => [i, 1 - v])
      steps.push(
        step(
          'one-left',
          2,
          place,
          cells.filter((i) => board[i] !== EMPTY),
          `${capital(nameOf(line, n))} needs just one more ${v}, and in ${place.length > 1 ? 'any of these cells' : 'this cell'} it would leave three alike in a row, so ${result(place)}.`,
        ),
      )
    }
  })
  return steps
}

//a line two cells short of matching a full one has to finish the other way round
export const twins = (board, n) => {
  const steps = []
  const lines = cellsOf(n)
  const all = (1 << n) - 1
  lines.forEach((cells, line) => {
    const empty = cells.filter((i) => board[i] === EMPTY)
    if (empty.length !== 2) return
    const { known, value } = readLine(board, cells)
    const twin = lines.findIndex((other, l) => {
      if (l === line || l < n !== line < n) return false
      const done = readLine(board, other)
      return done.known === all && (done.value & known) === value
    })
    if (twin < 0) return
    const place = empty.map((i) => [i, 1 - board[lines[twin][cells.indexOf(i)]]])
    if (place[0][1] === place[1][1]) return
    steps.push(
      step(
        'twins',
        2,
        place,
        [...cells, ...lines[twin]].filter((i) => board[i] !== EMPTY),
        `${capital(nameOf(line, n))} matches ${nameOf(twin, n)} except for these two cells, and no two ${line < n ? 'rows' : 'columns'} may match, so they go the other way round.`,
      ),
    )
  })
  return steps
}

//the valid lines that fit what a line already shows, without repeating a full line if asked
const fitsOf = (board, cells, n, repeats) => {
  const { known, value } = readLine(board, cells)
  return linesOf(n).filter((mask) => (mask & known) === value && !repeats?.has(mask))
}

//cells every fitting line agrees on, and whether nothing fits at all
const forced = (board, cells, n, fits) => {
  const { known } = readLine(board, cells)
  const all = (1 << n) - 1
  let ones = all
  let any = 0
  for (const mask of fits) {
    ones &= mask
    any |= mask
  }
  const fill = (ones | ~any) & all & ~known
  return cells.flatMap((i, k) => ((fill >> k) & 1 ? [[i, (ones >> k) & 1]] : []))
}

//full lines by orientation, as bitmasks with the line they came from
const fullLines = (board, n) => {
  const done = [new Map(), new Map()]
  const all = (1 << n) - 1
  cellsOf(n).forEach((cells, line) => {
    const { known, value } = readLine(board, cells)
    if (known === all) done[line < n ? 0 : 1].set(value, line)
  })
  return done
}

//every way to finish this one line without three alike agrees on some cells
export const balance = (board, n) => {
  const steps = []
  cellsOf(n).forEach((cells, line) => {
    const empty = cells.filter((i) => board[i] === EMPTY)
    if (!empty.length) return
    const fits = fitsOf(board, cells, n)
    if (!fits.length) {
      steps.push({ contradiction: true })
      return
    }
    const place = forced(board, cells, n, fits)
    if (!place.length) return
    const zeros = n / 2 - cells.filter((i) => board[i] === 0).length
    const ones = n / 2 - cells.filter((i) => board[i] === 1).length
    steps.push(
      step(
        'balance',
        3,
        place,
        cells.filter((i) => board[i] !== EMPTY),
        `${capital(nameOf(line, n))} still needs ${many(zeros, 0)} and ${many(ones, 1)}. Every way to fit them in without three alike in a row agrees here, so ${result(place)}.`,
      ),
    )
  })
  return steps
}

//no two rows or two columns may match, which can rule out the only other way to finish a line
export const repeats = (board, n) => {
  const steps = []
  const done = fullLines(board, n)
  cellsOf(n).forEach((cells, line) => {
    if (!cells.some((i) => board[i] === EMPTY)) return
    const others = done[line < n ? 0 : 1]
    const fits = fitsOf(board, cells, n)
    const blocked = fits.filter((mask) => others.has(mask))
    if (!blocked.length) return
    const left = fits.filter((mask) => !others.has(mask))
    if (!left.length) {
      steps.push({ contradiction: true })
      return
    }
    const place = forced(board, cells, n, left)
    if (!place.length) return
    const twins = blocked.map((mask) => others.get(mask))
    const lines = cellsOf(n)
    steps.push(
      step(
        'repeat',
        3,
        place,
        [cells, ...twins.map((l) => lines[l])].flat().filter((i) => board[i] !== EMPTY),
        `${capital(nameOf(line, n))} could otherwise end up the same as ${twins.map((l) => nameOf(l, n)).join(' or ')}, and no two ${line < n ? 'rows' : 'columns'} may match, so ${result(place)}.`,
      ),
    )
  })
  return steps
}

//what if: a value that leads the easier rules into a broken rule must be the other one
//the easier levels together are exactly line by line reasoning, so the fast line propagation stands in for them
export const whatIf = (board, n) => {
  const base = propagate(board.slice(), n, startCandidates(n))
  if (!base) return [{ contradiction: true }]
  const empty = [...board.keys()].filter((i) => board[i] === EMPTY)
  for (const i of empty) {
    for (const v of [0, 1]) {
      const trial = board.slice()
      trial[i] = v
      if (propagate(trial, n, base)) continue
      return [
        step(
          'what-if',
          4,
          [[i, 1 - v]],
          [i],
          `If this cell were a ${v}, the simpler rules would soon break a rule somewhere, so it must be a ${1 - v}.`,
        ),
      ]
    }
  }
  return []
}

const techniques = [[pairs, gaps], [counts], [oneLeft, twins], [balance, repeats], [whatIf]]

//the easiest steps available, or a contradiction, using techniques up to a level
export const nextSteps = (board, n, top = levels.length - 1) => {
  for (let level = 0; level <= top; level++) {
    for (const technique of techniques[level]) {
      const steps = technique(board, n)
      if (steps.some((s) => s.contradiction)) return { contradiction: true, steps: [] }
      if (steps.length) return { level, steps }
    }
  }
  return { steps: [] }
}

//applies steps in place, false when two steps disagree or a rule breaks
const apply = (board, n, steps) => {
  for (const { place } of steps) {
    for (const [i, v] of place) {
      if (board[i] !== EMPTY && board[i] !== v) return false
      board[i] = v
    }
  }
  return violations(board, n).size === 0
}

//the hardest level a board needs, or null when techniques up to top can't finish it
export const rate = (givens, n, top = levels.length - 1) => {
  const board = givens.slice()
  let hardest = 0
  while (!full(board)) {
    const { contradiction, level, steps } = nextSteps(board, n, top)
    if (contradiction || !steps.length) return null
    hardest = Math.max(hardest, level)
    if (!apply(board, n, steps)) return null
  }
  return { level: hardest, solution: board }
}
