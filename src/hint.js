import { neighboursOf } from './mines'

const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

//where cell b sits seen from cell a, so two equal numbers can be told apart
const where = (a, b, width) => {
  const dx = (b % width) - (a % width)
  const dy = Math.floor(b / width) - Math.floor(a / width)
  const v = dy < 0 ? 'above' : dy > 0 ? 'below' : ''
  const h = dx < 0 ? 'left' : dx > 0 ? 'right' : ''
  if (v && h) return `${v} and to the ${h} of it`
  return v ? `${v} it` : `to the ${h} of it`
}

//marks says what each highlighted cell is for, by index
const hint = (kind, cells, sources, text) => {
  const role = { clear: 'safe', mine: 'mine', conflict: 'wrong' }[kind]
  const marks = {}
  sources.forEach((i) => (marks[i] = 'source'))
  cells.forEach((i) => (marks[i] = role))
  return { kind, cells, sources, marks, text }
}

export const noHint = (text) => hint('none', [], [], text)

//a certain move from what is on the board, with the reasoning behind it
//only the numbers and the player's flags are used, never the real mines
export const findHint = ({ field, width, height, minesLeft }) => {
  const around = neighboursOf(width, height)
  const cells = field.flat()
  const numbered = []
  for (let i = 0; i < width * height; i++) if (cells[i].opened && cells[i].num) numbered.push(i)

  //what a number sees: its flags and the hidden cells that are not flagged
  const look = (i) => {
    const hidden = []
    const flagged = []
    for (const n of around[i]) {
      if (cells[n].flag) flagged.push(n)
      else if (!cells[n].opened) hidden.push(n)
    }
    return { hidden, flagged, need: cells[i].num - flagged.length }
  }
  const seen = new Map(numbered.map((i) => [i, look(i)]))

  //more flags than the number allows
  for (const i of numbered) {
    const { flagged, need } = seen.get(i)
    if (need < 0) {
      return hint(
        'conflict',
        flagged,
        [i],
        `The highlighted ${cells[i].num} touches ${count(flagged.length, 'flag')}, more than its number, so at least one of those flags is wrong.`,
      )
    }
  }

  //a number that already has its flags, or whose hidden cells must all be mines
  for (const i of numbered) {
    const { hidden, flagged, need } = seen.get(i)
    if (!hidden.length) continue
    const num = cells[i].num
    if (need === 0) {
      return hint(
        'clear',
        hidden,
        [i],
        `The highlighted ${num} already has ${count(flagged.length, 'flag')} around it, so its other hidden neighbours are safe.`,
      )
    }
    if (need === hidden.length) {
      const needs = flagged.length
        ? `touches ${count(flagged.length, 'flag')} and needs ${count(need, 'more mine')}`
        : `needs ${count(need, 'mine')}`
      const last = need === 1 ? 'it is a mine' : 'they are all mines'
      return hint(
        'mine',
        hidden,
        [i],
        `The highlighted ${num} ${needs}, and has exactly ${count(need, 'hidden neighbour')} left, so ${last}.`,
      )
    }
  }

  //one number whose hidden cells all sit inside another number's hidden cells
  for (const a of numbered) {
    const A = seen.get(a)
    if (!A.hidden.length) continue
    const nearby = new Set(A.hidden.flatMap((u) => around[u]))
    for (const b of nearby) {
      const B = seen.get(b)
      if (b === a || !B || B.hidden.length <= A.hidden.length) continue
      if (!A.hidden.every((u) => B.hidden.includes(u))) continue
      const rest = B.hidden.filter((u) => !A.hidden.includes(u))
      const extra = B.need - A.need
      if (extra !== 0 && extra !== rest.length) continue
      const shared = `Every hidden cell next to the highlighted ${cells[a].num} is also next to the ${cells[b].num} ${where(a, b, width)}. Those shared cells hold exactly ${count(A.need, 'mine')}`
      if (extra === 0) {
        return hint(
          'clear',
          rest,
          [a, b],
          `${shared}, which is all the ${cells[b].num} needs, so its other hidden neighbours are safe.`,
        )
      }
      const last = rest.length === 1 ? 'it is a mine' : 'they are all mines'
      return hint(
        'mine',
        rest,
        [a, b],
        `${shared}, so the ${cells[b].num} needs ${extra} more among its ${count(rest.length, 'other hidden neighbour')}, and ${last}.`,
      )
    }
  }

  //the mine counter against what is still hidden
  const left = []
  cells.forEach((c, i) => !c.opened && !c.flag && left.push(i))
  if (left.length && minesLeft === 0) {
    return hint(
      'clear',
      left,
      [],
      'The mine counter is at 0, so every hidden cell without a flag is safe.',
    )
  }
  if (left.length && minesLeft === left.length) {
    return hint(
      'mine',
      left,
      [],
      `The mine counter shows ${minesLeft} and exactly ${count(left.length, 'hidden cell')} without a flag ${left.length === 1 ? 'is' : 'are'} left, so ${left.length === 1 ? 'it is a mine' : 'they are all mines'}.`,
    )
  }

  return noHint(
    'Nothing on the board can be worked out for certain right now, so this needs a guess.',
  )
}
