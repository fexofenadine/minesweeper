import { expect, it } from 'vitest'
import { findHint } from './hint'

//'#' hidden, 'F' flagged, '0'-'8' opened with that number
const board = (rows, minesLeft = 9) => {
  const field = rows.map((row) =>
    [...row].map((c) => ({ opened: /\d/.test(c), flag: c === 'F', num: /\d/.test(c) ? +c : 0 })),
  )
  return { field, width: rows[0].length, height: rows.length, minesLeft }
}

const sorted = (list) => [...list].sort((a, b) => a - b)

it('flags every hidden neighbour of a number that needs them all', () => {
  const h = findHint(board(['3#', '##']))
  expect(h.kind).toBe('mine')
  expect(sorted(h.cells)).toEqual([1, 2, 3])
  expect(h.sources).toEqual([0])
  expect(h.text).toMatch(
    /needs 3 mines, and has exactly 3 hidden neighbours left, so they are all mines/,
  )
})

it('clears the other neighbours once a number has its flags', () => {
  const h = findHint(board(['1F#', '###']))
  expect(h.kind).toBe('clear')
  expect(sorted(h.cells)).toEqual([3, 4])
  expect(h.text).toMatch(/already has 1 flag/)
})

it('clears the cells only the bigger number sees when both need the same mines', () => {
  const h = findHint(board(['1#', '1#', '##']))
  expect(h.kind).toBe('clear')
  expect(sorted(h.cells)).toEqual([4, 5])
  expect(sorted(h.sources)).toEqual([0, 2])
})

it('flags the extra cell when the bigger number needs one more mine', () => {
  const h = findHint(board(['#10', '#20', '#10']))
  expect(h.kind).toBe('mine')
  expect(h.cells).toEqual([6])
  expect(sorted(h.sources)).toEqual([1, 4])
})

it('reports flags that contradict a number', () => {
  const h = findHint(board(['1F', 'F#']))
  expect(h.kind).toBe('conflict')
  expect(sorted(h.cells)).toEqual([1, 2])
})

it('uses the mine counter when no number helps', () => {
  expect(findHint(board(['1#', '##'], 3)).kind).toBe('mine')
  const none = findHint(board(['2F', 'F#'], 0))
  expect(none.kind).toBe('clear')
  expect(none.cells).toEqual([3])
})

it('says so when only a guess is left', () => {
  const h = findHint(board(['1#', '##'], 2))
  expect(h.kind).toBe('none')
  expect(h.cells).toEqual([])
})

it('says where the second number is so equal numbers can be told apart', () => {
  const h = findHint(board(['1#', '1#', '##']))
  expect(h.text).toMatch(/next to the 1 below it/)
  expect(h.marks).toEqual({ 0: 'source', 2: 'source', 4: 'safe', 5: 'safe' })
})
