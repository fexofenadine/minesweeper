import { beforeEach, expect, it } from 'vitest'
import { app, h } from 'hyperapp'
import { state, actions, view } from './app'
import { solvable } from './mines'

it('renders without crashing', async () => {
  const container = document.createElement('div')
  await new Promise((resolve) => {
    const testView = () => <div oncreate={resolve}>{view(state, actions)}</div>
    app(state, actions, testView, container)
  })
})

//9x9 board with a flagged mine at the top left, a wall of mines in column 4
//and the 1 at x=1 y=1 already opened, so it is ready to chord
const chordGame = (flagged = true) => {
  const field = Array.from({ length: 9 }, (_, y) =>
    Array.from({ length: 9 }, (_, x) => ({
      opened: false,
      mined: (x === 0 && y === 0) || x === 4,
      flag: false,
      mark: false,
      num: 0,
    })),
  )
  field[0][0].flag = flagged
  field[1][1].opened = true
  field[1][1].num = 1
  return {
    ...state.game,
    width: 9,
    height: 9,
    mines: 10,
    field,
    left: 81 - 10 - 1,
    flags: 9,
    start: 0,
    time: 1,
  }
}

let wired
let current

const peek = () => (s) => {
  current = s
}

const start = (settings) => {
  wired = app({ ...state, ...settings }, { ...actions, peek }, () => null)
}

beforeEach(() => start({ game: chordGame() }))

const game = () => {
  wired.peek()
  return current.game
}

const neighbours = [
  [0, 1],
  [1, 0],
  [2, 0],
  [0, 2],
  [2, 1],
  [1, 2],
  [2, 2],
]

it('double click on a satisfied number opens its unflagged neighbours', () => {
  wired.chord({ x: 1, y: 1 })
  const { field, lose } = game()
  expect(lose).toBe(false)
  for (const [x, y] of neighbours) expect(field[y][x].opened).toBe(true)
  expect(field[0][0].opened).toBe(false)
})

it('double click does nothing when the flags do not match the number', () => {
  start({ game: chordGame(false) })
  wired.chord({ x: 1, y: 1 })
  expect(
    game()
      .field.flat()
      .filter((c) => c.opened),
  ).toHaveLength(1)
})

it('tap on a satisfied number opens its unflagged neighbours', () => {
  const rect = { left: 0, right: 16, top: 0, bottom: 16 }
  wired.touch({ event: { currentTarget: { getBoundingClientRect: () => rect } }, x: 1, y: 1 })
  const end = new Event('touchend')
  end.changedTouches = [{ clientX: 8, clientY: 8 }]
  window.dispatchEvent(end)
  const { field, lose } = game()
  expect(lose).toBe(false)
  for (const [x, y] of neighbours) expect(field[y][x].opened).toBe(true)
})

const firstClick = (settings, x = 4, y = 4) => {
  start(settings)
  wired.down({ event: { button: 0, buttons: 1 }, x, y })
  wired.up()
  return game()
}

it('safe first click never loses on the first click', () => {
  for (let run = 0; run < 100; run++) {
    expect(firstClick({ safeStart: true, noGuess: false }).lose).toBe(false)
  }
})

it('flagging or chording before the first click does not start the game', () => {
  start({ safeStart: true, noGuess: true })
  wired.down({ event: { button: 2, buttons: 2 }, x: 0, y: 0 })
  wired.up()
  wired.down({ event: { button: 0, buttons: 1, shiftKey: true }, x: 8, y: 8 })
  wired.up()
  const { start: began, field } = game()
  expect(began).toBe(-1)
  expect(field.flat().some((c) => c.mined)).toBe(false)
  expect(field[0][0].flag).toBe(true)
})

it('no guessing deals a solvable board from the first opened cell after a flag', () => {
  for (let run = 0; run < 20; run++) {
    start({ safeStart: false, noGuess: true })
    wired.down({ event: { button: 2, buttons: 2 }, x: 0, y: 0 })
    wired.up()
    wired.down({ event: { button: 0, buttons: 1 }, x: 6, y: 6 })
    wired.up()
    const { field, width, height, lose } = game()
    expect(lose).toBe(false)
    expect(field[6][6].num).toBe(0)
    const mined = Uint8Array.from(field.flat(), (c) => (c.mined ? 1 : 0))
    expect(solvable(mined, width, height, 6 * width + 6)).toBe(true)
  }
})

it('no guessing opens an area on the first click and deals a solvable board', () => {
  for (let run = 0; run < 20; run++) {
    const { field, width, height, lose } = firstClick({ safeStart: false, noGuess: true })
    expect(lose).toBe(false)
    expect(field[4][4].num).toBe(0)
    const mined = Uint8Array.from(field.flat(), (c) => (c.mined ? 1 : 0))
    expect(solvable(mined, width, height, 4 * width + 4)).toBe(true)
  }
})
