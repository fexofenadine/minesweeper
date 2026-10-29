import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { app, h } from 'hyperapp'
import { state, actions, view, createGame, upgradeLadder } from './app'
import { EMPTY } from './rules'
import { makeGame, random } from './generate'

//a dealt medium 6x6 board, ready to play
const dealtGame = (seed = 5) => {
  const { givens, solution } = makeGame(6, 1, random(seed))
  return {
    ...createGame({ n: 6, level: 1 }),
    givens,
    solution,
    board: givens.slice(),
    dealing: false,
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

const now = () => {
  wired.peek()
  return current
}

const left = { button: 0 }
const right = { button: 2 }

afterEach(() => vi.useRealTimers())

beforeEach(() => {
  localStorage.clear()
  start({ game: dealtGame() })
})

const emptyCell = () => now().game.board.indexOf(EMPTY)

it('renders and deals a board without crashing', async () => {
  const container = document.createElement('div')
  await new Promise((resolve) => {
    const testView = () => <div oncreate={resolve}>{view(state, actions)}</div>
    app(state, actions, testView, container)
  })
  expect(container.querySelectorAll('[class*=empty]').length).toBeGreaterThan(0)
})

it('cycles a cell through 0, 1 and empty, backwards on right click, and starts the clock', () => {
  const i = emptyCell()
  wired.play({ event: left, i })
  expect(now().game.board[i]).toBe(0)
  expect(now().game.start).toBeGreaterThanOrEqual(0)
  wired.play({ event: left, i })
  expect(now().game.board[i]).toBe(1)
  wired.play({ event: left, i })
  expect(now().game.board[i]).toBe(EMPTY)
  wired.play({ event: right, i })
  expect(now().game.board[i]).toBe(1)
})

it('never changes a clue', () => {
  const i = now().game.givens.findIndex((v) => v !== EMPTY)
  const before = now().game.board[i]
  wired.play({ event: left, i })
  expect(now().game.board[i]).toBe(before)
  expect(now().game.history).toHaveLength(0)
})

it('undoes changes one at a time, also with ctrl+z', () => {
  const i = emptyCell()
  wired.play({ event: left, i })
  wired.play({ event: left, i })
  wired.undo()
  expect(now().game.board[i]).toBe(0)
  wired.press({ keyCode: 90, ctrlKey: true, target: { tagName: 'BODY' }, preventDefault() {} })
  expect(now().game.board[i]).toBe(EMPTY)
  expect(now().game.history).toHaveLength(0)
})

//sets every open cell to its value with left clicks, leaving out skip
const fill = (values, skip = -1) => {
  const { board, givens } = now().game
  board.forEach((_, i) => {
    if (givens[i] !== EMPTY || i === skip) return
    while (now().game.board[i] !== values[i]) wired.play({ event: left, i })
  })
}

//an open cell whose answer is v, and a full board that is wrong somewhere else
const lastCell = (v) => {
  const { board, solution } = now().game
  const last = [...board.keys()].find((i) => board[i] === EMPTY && solution[i] === v)
  const wrong = solution.slice()
  wrong[[...board.keys()].find((i) => board[i] === EMPTY && i !== last)] ^= 1
  return { last, wrong }
}

it('does not ask while the last cell passes through 0 on its way to 1', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const { last } = lastCell(1)
  fill(now().game.solution, last)
  wired.play({ event: left, i: last })
  expect(now().prompt).toBe(false)
  wired.play({ event: left, i: last })
  expect(now().game.win).toBe(true)
  vi.advanceTimersByTime(3000)
  expect(now().prompt).toBe(false)
})

it('asks at once when the last click ends a cell on its final value', () => {
  const { last, wrong } = lastCell(1)
  fill(wrong, last)
  wired.play({ event: left, i: last })
  wired.play({ event: left, i: last })
  expect(now().prompt).toBe(true)
  expect(now().game.win).toBe(false)
})

it('asks a little later when the last cell may still be on its way, unless it changes', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const { last, wrong } = lastCell(1)
  fill(wrong, last)
  wired.play({ event: left, i: last })
  expect(now().prompt).toBe(false)
  vi.advanceTimersByTime(2500)
  expect(now().prompt).toBe(true)
  wired.answerPrompt(false)
  //a right click to 1 is part way round too, and changing the board again drops the question
  wired.play({ event: left, i: last })
  wired.answerPrompt(false)
  wired.play({ event: left, i: last })
  wired.play({ event: right, i: last })
  expect(now().game.board[last]).toBe(1)
  expect(now().prompt).toBe(false)
  vi.advanceTimersByTime(1000)
  wired.undo()
  vi.advanceTimersByTime(2000)
  expect(now().prompt).toBe(false)
  wired.play({ event: right, i: last })
  vi.advanceTimersByTime(2500)
  expect(now().prompt).toBe(true)
})

it('gives a hint on a yes and leaves the player alone on a no', () => {
  const { last, wrong } = lastCell(1)
  fill(wrong, last)
  wired.play({ event: left, i: last })
  wired.play({ event: left, i: last })
  wired.answerPrompt(false)
  expect(now().prompt).toBe(false)
  expect(now().hint).toBe(null)
  expect(now().game.hinted).toBe(false)
  //a right click back to 0 is as far as that way goes
  wired.play({ event: right, i: last })
  expect(now().prompt).toBe(true)
  wired.answerPrompt(true)
  expect(now().prompt).toBe(false)
  expect(now().game.hinted).toBe(true)
  expect(['break', 'wrong']).toContain(now().hint.kind)
})

it('wins on the solution and offers a best time', () => {
  fill(now().game.solution)
  const { game, winner } = now()
  expect(game.win).toBe(true)
  expect(winner).toMatchObject({ level: 'medium 6 × 6', hinted: false })
  wired.changeWinner({ name: ' Ada ' })
  wired.submitBestTime({ preventDefault() {} })
  expect(localStorage.getItem('takuzu.6.1')).toBe(String(game.time))
  expect(now().bestTime.clean['6.1']).toEqual({ time: game.time, name: 'Ada' })
  expect(now().bestTime.clean['8.1']).toEqual({ time: 999, name: 'Anonymous' })
})

it('counts a hint before the first move, and starts the clock', () => {
  wired.hint()
  const { game, hint } = now()
  expect(game.hinted).toBe(true)
  expect(game.start).toBeGreaterThanOrEqual(0)
  expect(hint.place.length).toBeGreaterThan(0)
  //a change clears the explanation
  wired.play({ event: left, i: emptyCell() })
  expect(now().hint).toBe(null)
})

it('ignores the board while paused', () => {
  wired.play({ event: left, i: emptyCell() })
  wired.pause()
  const i = emptyCell()
  wired.play({ event: left, i })
  wired.undo()
  expect(now().game.board[i]).toBe(EMPTY)
  expect(now().game.history).toHaveLength(1)
})

it('has no expert 6x6, falling back to hard', () => {
  start({ game: { ...dealtGame(), level: 4 } })
  wired.reset({ n: 6 })
  expect(now().game).toMatchObject({ n: 6, level: 3, dealing: true })
  expect(localStorage.getItem('takuzu.level')).toBe('3')
})

it('drops an answer from an older deal', async () => {
  wired.reset({ n: 8 })
  const first = now().game.deal
  wired.reset({ n: 10 })
  wired.dealt({ id: first, givens: new Int8Array(64), solution: new Int8Array(64) })
  expect(now().game).toMatchObject({ n: 10, dealing: true })
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(now().game).toMatchObject({ n: 10, dealing: false })
  expect(now().game.board).toHaveLength(100)
})

it('remembers the rain glyph choice and opens the about box', () => {
  wired.toggleRain()
  expect(now().rain).toBe(true)
  expect(localStorage.getItem('takuzu.rain')).toBe('yes')
  wired.toggleRain()
  expect(now().rain).toBe(false)
  wired.toggleAbout()
  expect(now().about).toBe(true)
})

it('clears the old best times once when tricky arrives, keeping a hard choice hard', () => {
  localStorage.setItem('takuzu.8.2', '50')
  localStorage.setItem('takuzu.8.2.name', 'Old')
  localStorage.setItem('takuzu.10.3.hints', '90')
  localStorage.setItem('takuzu.level', '2')
  localStorage.removeItem('takuzu.ladder')
  upgradeLadder()
  expect(localStorage.getItem('takuzu.8.2')).toBe(null)
  expect(localStorage.getItem('takuzu.8.2.name')).toBe(null)
  expect(localStorage.getItem('takuzu.10.3.hints')).toBe(null)
  expect(localStorage.getItem('takuzu.level')).toBe('3')
  //only once
  localStorage.setItem('takuzu.8.2', '40')
  upgradeLadder()
  expect(localStorage.getItem('takuzu.8.2')).toBe('40')
  expect(localStorage.getItem('takuzu.level')).toBe('3')
})
