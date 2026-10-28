import { beforeEach, expect, it } from 'vitest'
import { app, h } from 'hyperapp'
import { state, actions, view, createGame } from './app'
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

const fill = (values) => {
  const { board, givens } = now().game
  board.forEach((_, i) => {
    if (givens[i] !== EMPTY) return
    const want = values[i]
    while (now().game.board[i] !== want) wired.play({ event: left, i })
  })
}

it('asks about a full board with errors, and a yes gives a hint', () => {
  const { solution } = now().game
  const wrong = solution.slice()
  const i = emptyCell()
  wrong[i] = 1 - wrong[i]
  fill(wrong)
  expect(now().prompt).toBe(true)
  expect(now().game.win).toBe(false)
  wired.answerPrompt(true)
  expect(now().prompt).toBe(false)
  expect(now().game.hinted).toBe(true)
  expect(['break', 'wrong']).toContain(now().hint.kind)
})

it('leaves the player to fix a full board on a no', () => {
  const { solution } = now().game
  const wrong = solution.slice()
  wrong[emptyCell()] ^= 1
  fill(wrong)
  wired.answerPrompt(false)
  expect(now().prompt).toBe(false)
  expect(now().hint).toBe(null)
  expect(now().game.hinted).toBe(false)
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
  expect(now().bestTime.clean['8.1']).toBe(null)
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
  start({ game: { ...dealtGame(), level: 3 } })
  wired.reset({ n: 6 })
  expect(now().game).toMatchObject({ n: 6, level: 2, dealing: true })
  expect(localStorage.getItem('takuzu.level')).toBe('2')
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
