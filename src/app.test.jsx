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

it('asking for a hint marks the game as hinted and shows the reasoning', () => {
  wired.hint()
  wired.peek()
  expect(current.game.hinted).toBe(true)
  expect(current.hint.text).toBeTruthy()
})

it('a hint before the first click does not count as used', () => {
  start({ game: { ...chordGame(), start: -1 } })
  wired.hint()
  expect(game().hinted).toBe(false)
})

it('keeps best times with and without hints apart', () => {
  localStorage.clear()
  const finish = (hinted, time) => {
    start({ game: { ...chordGame(), level: 'beginner', hinted, time } })
    wired.win()
    wired.submitBestTime({ preventDefault() {} })
    wired.peek()
  }
  finish(false, 90)
  finish(true, 50)
  expect(localStorage.getItem('beginner')).toBe('90')
  expect(localStorage.getItem('beginnerHints')).toBe('50')
  expect(current.bestTime.tab).toBe('hinted')
  expect(current.bestTime.clean[0].time).toBe(90)
  expect(current.bestTime.hinted[0].time).toBe(50)
  wired.resetBestTime()
  wired.peek()
  expect(current.bestTime.hinted[0]).toMatchObject({ time: null, name: '' })
  expect(current.bestTime.clean[0].time).toBe(90)
  localStorage.clear()
})

it('ignores shortcut keys while typing or with a modifier held', () => {
  start({ game: chordGame() })
  const key = (keyCode, extra) => wired.press({ keyCode, target: { tagName: 'BODY' }, ...extra })
  key(78, { target: { tagName: 'INPUT' } })
  key(78, { ctrlKey: true })
  key(72, { ctrlKey: true })
  expect(game().start).toBe(0)
  expect(current.hint).toBe(null)
  key(72)
  expect(game().hinted).toBe(true)
  key(78)
  expect(game().start).toBe(-1)
})

it('explains a chord on a number without enough flags', () => {
  start({ game: chordGame(false) })
  wired.chord({ x: 1, y: 1 })
  wired.peek()
  expect(current.hint.text).toMatch(
    /This 1 has none, so flag 1 more mine among the highlighted cells first/,
  )
  expect(current.hint.marks[1 * 9 + 1]).toBe('source')
  expect(current.hint.marks[0]).toBe('unsure')
  expect(game().hinted).toBe(false)
})

it('explains a chord on a number with too many flags', () => {
  const extra = chordGame()
  extra.field[0][1].flag = true
  start({ game: extra })
  wired.chord({ x: 1, y: 1 })
  wired.peek()
  expect(current.hint.text).toMatch(/touches 2 flags/)
  expect(current.hint.marks[0]).toBe('wrong')
  expect(current.hint.marks[1]).toBe('wrong')
})

it('explains a failed chord with both buttons', () => {
  start({ game: chordGame(false) })
  wired.down({ event: { button: 0, buttons: 3 }, x: 1, y: 1 })
  wired.up()
  wired.peek()
  expect(current.hint.text).toMatch(/Chording needs exactly/)
})

it('does not call the double click that opened a number a failed chord', () => {
  start({ game: chordGame(false) })
  wired.down({ event: { button: 0, buttons: 1 }, x: 3, y: 2 })
  wired.up()
  expect(game().field[2][3].num).toBe(3)
  wired.chord({ x: 3, y: 2 })
  wired.peek()
  expect(current.hint).toBe(null)
})

it('previews background settings live and only saves them on OK', () => {
  localStorage.clear()
  start({ theme: 'nord' })
  wired.toggleBackgroundSettings()
  wired.peek()
  expect(current.backgroundSettings.id).toBe('substrate')
  wired.changeBackgroundSettings({ maxCracks: 50 })
  wired.peek()
  expect(current.backgroundSettings.draft.maxCracks).toBe(50)
  expect(current.backgrounds.substrate.maxCracks).toBe(100)
  wired.toggleBackgroundSettings()
  wired.peek()
  expect(current.backgroundSettings).toBe(null)
  expect(localStorage.getItem('backgrounds')).toBe(null)

  wired.toggleBackgroundSettings()
  wired.changeBackgroundSettings({ wireframe: true })
  wired.submitBackgroundSettings({ preventDefault() {} })
  wired.peek()
  expect(current.backgrounds.substrate.wireframe).toBe(true)
  const stored = JSON.parse(localStorage.getItem('backgrounds'))
  expect(stored.substrate.wireframe).toBe(true)
  expect(stored.matrix.density).toBe(44)

  wired.toggleBackgroundSettings()
  wired.resetBackgroundSettings()
  wired.peek()
  expect(current.backgroundSettings.draft.wireframe).toBe(false)
  localStorage.clear()
})

it('has no background settings for themes without one', () => {
  start({ theme: 'synthwave' })
  wired.toggleBackgroundSettings()
  wired.peek()
  expect(current.backgroundSettings).toBe(null)
})

it('has an extreme level at expert density, 30% wider and taller', () => {
  start({})
  wired.reset({ level: 'extreme' })
  const { width, height, mines } = game()
  expect([width, height, mines]).toEqual([39, 21, 169])
  expect(Math.abs(mines / (width * height) - 99 / (30 * 16))).toBeLessThan(0.001)
  expect(current.game.field.flat()).toHaveLength(39 * 21)
})

it('zooms in steps from the size shown and remembers the choice', () => {
  localStorage.clear()
  start({ zoom: { chosen: 1, scale: 0.8, seen: null } })
  wired.zoom(1)
  wired.peek()
  expect(current.zoom).toMatchObject({ chosen: 0.875, scale: 0.875 })
  expect(localStorage.getItem('scale')).toBe('0.875')
  wired.zoom(0)
  wired.peek()
  expect(current.zoom).toMatchObject({ chosen: 1, scale: 1 })
  localStorage.clear()
})

it('shows a wide board transposed on a portrait screen, keeping each cell its own place', () => {
  const container = document.createElement('div')
  const cellsOf = (portrait) =>
    new Promise((resolve) => {
      const shown = { ...state, game: chordGame(), portrait }
      shown.game.field = shown.game.field.slice(0, 3)
      shown.game.height = 3
      const testView = () => (
        <div
          oncreate={(el) => {
            const rows = [...el.querySelectorAll('[class*=active]')]
            resolve(rows.map((row) => row.children.length))
          }}
        >
          {view(shown, actions)}
        </div>
      )
      app(shown, actions, testView, container)
    })
  return Promise.all([cellsOf(false), cellsOf(true)]).then(([wide, tall]) => {
    expect(wide).toEqual([9, 9, 9])
    expect(tall).toEqual(Array(9).fill(3))
  })
})

it('keeps an explanation through clicks that change nothing, and clears it when the board changes', () => {
  start({ game: chordGame(false) })
  wired.chord({ x: 1, y: 1 })
  wired.down({ event: { button: 0, buttons: 1 }, x: 1, y: 1 })
  wired.up()
  wired.peek()
  expect(current.hint).not.toBe(null)
  wired.down({ event: { button: 2, buttons: 2 }, x: 0, y: 0 })
  wired.peek()
  expect(current.hint).toBe(null)
})

it('calls the window Minesweeper on classic and Minesweeper Plus on the other themes', async () => {
  const titleOf = (theme) =>
    new Promise((resolve) => {
      const container = document.createElement('div')
      const testView = () => (
        <div oncreate={(el) => resolve(el.querySelector('h1').textContent)}>
          {view({ ...state, theme }, actions)}
        </div>
      )
      app({ ...state, theme }, actions, testView, container)
    })
  expect(await titleOf('classic')).toBe('Minesweeper')
  for (const theme of ['synthwave', 'matrix', 'nord', 'solarized', 'solarized-phosphor']) {
    expect(await titleOf(theme)).toBe('Minesweeper Plus')
  }
})

it('opens and closes the about box', () => {
  start({})
  wired.toggleAbout()
  wired.peek()
  expect(current.about).toBe(true)
  wired.toggleAbout()
  wired.peek()
  expect(current.about).toBe(false)
})

it('pauses the clock and picks up from the same time', () => {
  start({ game: { ...chordGame(), time: 5 } })
  wired.pause()
  const paused = game()
  expect(paused.paused).toBe(true)
  wired.pause()
  const resumed = game()
  expect(resumed.paused).toBe(false)
  expect(resumed.start).toBeGreaterThan(paused.start)
  expect(resumed.start - paused.start).toBeCloseTo(performance.now() - paused.pausedAt, -2)
})

it('ignores clicks, chords and hints while paused', () => {
  wired.pause()
  wired.down({ event: { button: 0, buttons: 1 }, x: 3, y: 2 })
  wired.up()
  wired.chord({ x: 1, y: 1 })
  wired.hint()
  const { field, hinted } = game()
  expect(field.flat().filter((c) => c.opened)).toHaveLength(1)
  expect(hinted).toBe(false)
})

it('only pauses a game that is running', () => {
  start({ game: { ...chordGame(), start: -1 } })
  wired.pause()
  expect(game().paused).toBe(false)
  start({ game: { ...chordGame(), win: true } })
  wired.pause(true)
  expect(game().paused).toBe(false)
})

it('pauses on p and leaves a paused game paused when told to pause', () => {
  wired.press({ keyCode: 80, target: { tagName: 'BODY' } })
  expect(game().paused).toBe(true)
  wired.pause(true)
  expect(game().paused).toBe(true)
})

it('esc shows the spreadsheet and pauses, and only esc takes it away', () => {
  const key = (keyCode) => wired.press({ keyCode, target: { tagName: 'BODY' } })
  key(27)
  wired.peek()
  expect(current.boss.rows).toHaveLength(10)
  expect(current.game.paused).toBe(true)
  key(78)
  key(80)
  wired.peek()
  expect(current.boss).not.toBe(null)
  expect(current.game.start).toBe(0)
  key(27)
  wired.peek()
  expect(current.boss).toBe(null)
  expect(current.game.paused).toBe(true)
})

it('hides the board while paused and covers the page with the spreadsheet', () =>
  new Promise((resolve) => {
    const container = document.createElement('div')
    const shown = { ...state, game: { ...chordGame(), paused: true }, boss: { rows: [] } }
    shown.game.field[0][0].flag = true
    const testView = () => (
      <div
        oncreate={(el) => {
          expect(el.querySelectorAll('[class*=flag]')).toHaveLength(0)
          expect(el.querySelector('[title="Resume (P)"]')).not.toBe(null)
          expect(document.title).toBe('Q3 budget')
          expect(document.documentElement.dataset.boss).toBe('true')
          resolve()
        }}
      >
        {view(shown, actions)}
      </div>
    )
    app(shown, actions, testView, container)
  }))
