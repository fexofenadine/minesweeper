import { expect, it } from 'vitest'
import { placeMines, solvable } from './mines'

const count = (mined) => mined.reduce((sum, m) => sum + m, 0)

const board = (rows) => ({
  mined: Uint8Array.from(rows.join('').split(''), (c) => (c === '*' ? 1 : 0)),
  width: rows[0].length,
  height: rows.length,
})

it('places the exact number of mines', () => {
  for (const safe of [false, true]) {
    const { mined } = placeMines({ width: 30, height: 16, mines: 99, x: 5, y: 5, safe })
    expect(count(mined)).toBe(99)
  }
})

it('safe first click never puts a mine under the click', () => {
  for (let run = 0; run < 500; run++) {
    const { mined } = placeMines({ width: 9, height: 9, mines: 64, x: 4, y: 4, safe: true })
    expect(mined[4 * 9 + 4]).toBe(0)
  }
})

it('without safe first click the click can land on a mine', () => {
  let hits = 0
  for (let run = 0; run < 200; run++) {
    const { mined } = placeMines({ width: 9, height: 9, mines: 64, x: 4, y: 4, safe: false })
    hits += mined[4 * 9 + 4]
  }
  expect(hits).toBeGreaterThan(0)
})

it('solver clears a board that needs no guessing', () => {
  const { mined, width, height } = board(['*....', '.....', '.....', '.....', '....*'])
  expect(solvable(mined, width, height, 12)).toBe(true)
})

it('solver rejects a 50/50 that needs a guess', () => {
  //the two cells top left share the same clues, so either could be the mine
  const { mined, width, height } = board(['*.', '..', '..', '..'])
  expect(solvable(mined, width, height, 7)).toBe(false)
})

it('solver uses one clue inside another', () => {
  //1-2-1 against a wall needs the subset rule
  const { mined, width, height } = board(['*.*', '...', '...'])
  expect(solvable(mined, width, height, 7)).toBe(true)
})

for (const [name, width, height, mines] of [
  ['beginner', 9, 9, 10],
  ['intermediate', 16, 16, 40],
  ['expert', 30, 16, 99],
]) {
  it(`no guessing makes solvable ${name} boards quickly`, () => {
    const times = []
    for (let run = 0; run < 20; run++) {
      const x = Math.floor(Math.random() * width)
      const y = Math.floor(Math.random() * height)
      const startedAt = performance.now()
      const result = placeMines({ width, height, mines, x, y, safe: true, noGuess: true })
      times.push(performance.now() - startedAt)
      expect(result.solvable).toBe(true)
      expect(count(result.mined)).toBe(mines)
      expect(solvable(result.mined, width, height, y * width + x)).toBe(true)
    }
    times.sort((a, b) => a - b)
    console.log(`${name}: median ${times[10].toFixed(1)}ms, worst ${times[19].toFixed(1)}ms`)
  })
}
