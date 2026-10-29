import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { app, h } from 'hyperapp'
import { state, actions, view, createGame } from './app'
import { CROSS, EMPTY, FILL } from './rules'
import { makePuzzle, random } from './generate'
import { clockDigits } from '../shell/clock'
import Digit from '../Digit'

//a dealt 5x5 board, ready to play
const dealtGame = (seed = 5) => {
  const { clues, solution } = makePuzzle(5, random(seed))
  return { ...createGame({ n: 5, level: 0 }), clues, solution, dealing: false }
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

const left = { button: 0, pointerType: 'mouse' }
const right = { button: 2, pointerType: 'mouse' }
const tap = { button: 0, pointerType: 'touch' }

const click = (i, event = left) => {
  wired.down({ event, i })
  wired.up()
}

const board = () => [...now().game.board]

beforeEach(() => {
  localStorage.clear()
  start({ game: dealtGame(), mode: FILL })
})

afterEach(() => {
  vi.useRealTimers()
})

//every fill of the solution but one, and one wrong fill in its place, all but the wrong fill done
const almost = () => {
  const { solution } = now().game
  const missing = solution.indexOf(1)
  const wrong = solution.indexOf(0)
  solution.forEach((v, i) => v && i !== missing && click(i))
  return wrong
}

it('renders and deals a board without crashing', async () => {
  const container = document.createElement('div')
  await new Promise((resolve) => {
    const testView = () => <div oncreate={resolve}>{view(state, actions)}</div>
    app(state, actions, testView, container)
  })
  expect(container.querySelectorAll('[data-cell]').length).toBe(100)
})

it('cycles a cell through filled, crossed and empty, backwards on right click, and starts the clock', () => {
  click(0)
  expect(board()[0]).toBe(FILL)
  expect(now().game.start).toBeGreaterThanOrEqual(0)
  click(0)
  expect(board()[0]).toBe(CROSS)
  click(0)
  expect(board()[0]).toBe(EMPTY)
  click(0, right)
  expect(board()[0]).toBe(CROSS)
})

it('paints a stroke along the row it first moves along, as one undo step', () => {
  wired.down({ event: left, i: 6 })
  wired.drag(7)
  //moving off the row keeps to it, out to the nearest cell along it
  wired.drag(14)
  expect(board().slice(5, 10)).toEqual([EMPTY, FILL, FILL, FILL, FILL])
  expect(board()[14]).toBe(EMPTY)
  //coming back unpaints
  wired.drag(7)
  expect(board().slice(5, 10)).toEqual([EMPTY, FILL, FILL, EMPTY, EMPTY])
  wired.up()
  expect(now().game.history).toHaveLength(1)
  wired.undo()
  expect(board().every((v) => v === EMPTY)).toBe(true)
})

it('paints down a column and leaves cells with another value alone', () => {
  click(10, right)
  wired.down({ event: left, i: 0 })
  wired.drag(5)
  wired.drag(20)
  wired.up()
  expect([0, 5, 10, 15, 20].map((i) => board()[i])).toEqual([FILL, FILL, CROSS, FILL, FILL])
})

it('fills or crosses on a tap as the touch mode says', () => {
  click(0, tap)
  expect(board()[0]).toBe(FILL)
  expect(now().touch).toBe(true)
  click(0, tap)
  expect(board()[0]).toBe(EMPTY)
  wired.setMode(CROSS)
  click(0, tap)
  expect(board()[0]).toBe(CROSS)
})

it('wins once every clue matches, without crosses, and stops taking strokes', () => {
  const { solution } = now().game
  solution.forEach((v, i) => v && click(i))
  expect(now().game.win).toBe(true)
  const before = board()
  click(solution.indexOf(0))
  expect(board()).toEqual(before)
})

it('ignores the board while paused', () => {
  click(0)
  wired.pause(true)
  click(1)
  expect(board()[1]).toBe(EMPTY)
  wired.pause(false)
  click(1)
  expect(board()[1]).toBe(FILL)
})

it('grows the clock a fourth digit past 999 except on classic', () => {
  expect(clockDigits('nord', 999)).toBe(3)
  expect(clockDigits('nord', 1000)).toBe(4)
  expect(clockDigits('classic', 1500)).toBe(3)
  const digits = (vnode) =>
    vnode.children
      .flat()
      .map((svg) => svg.attributes['data-n'])
      .join('')
  expect(digits(Digit({ value: 1234, digits: 4 }))).toBe('1234')
  expect(digits(Digit({ value: 1234 }))).toBe('999')
  expect(digits(Digit({ value: -5 }))).toBe('-05')
})

it('gives a hint, counts it, starts the clock, and drops it once the board changes', () => {
  wired.hint()
  const { hint, game } = now()
  expect(hint.text.length).toBeGreaterThan(0)
  expect(hint.place.length).toBeGreaterThan(0)
  expect(game.hinted).toBe(true)
  expect(game.start).toBeGreaterThanOrEqual(0)
  //following it agrees with the solution
  const [i, v] = hint.place[0]
  expect(v).toBe(game.solution[i] ? FILL : CROSS)
  click(i, v === FILL ? left : right)
  expect(board()[i]).toBe(v)
  expect(now().hint).toBe(null)
})

it('has no expert 5x5, falling back to hard', () => {
  wired.reset({ n: 5, level: 3 })
  expect(now().game.level).toBe(2)
  expect(localStorage.getItem('nonograms.level')).toBe('2')
})

it('asks about a hint at once when the fills are all placed but wrong, unless a fill may be passing', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const wrong = almost()
  expect(now().prompt).toBe(false)
  //a right click back from a cross is settled
  click(wrong, right)
  click(wrong, right)
  expect(board()[wrong]).toBe(FILL)
  expect(now().prompt).toBe(true)
  wired.answerPrompt(true)
  expect(now().prompt).toBe(false)
  expect(now().hint.marks[wrong]).toBe('wrong')
})

it('asks a little later after a single fill, and not if the cell moves on to a cross', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const wrong = almost()
  click(wrong)
  expect(now().prompt).toBe(false)
  click(wrong)
  vi.advanceTimersByTime(2500)
  expect(now().prompt).toBe(false)
  click(wrong, right)
  vi.advanceTimersByTime(2500)
  expect(now().prompt).toBe(true)
  wired.answerPrompt(false)
  expect(now().prompt).toBe(false)
  expect(now().hint).toBe(null)
})

it('wins and offers a best time, kept apart from hinted games', () => {
  const { solution } = now().game
  solution.forEach((v, i) => v && click(i))
  const { game, winner } = now()
  expect(winner).toMatchObject({ level: 'easy 5 × 5', hinted: false })
  wired.changeWinner({ name: ' Ada ' })
  wired.submitBestTime({ preventDefault() {} })
  expect(localStorage.getItem('nonograms.5.0')).toBe(String(game.time))
  expect(localStorage.getItem('nonograms.name')).toBe('Ada')
  expect(now().bestTime.clean['5.0']).toEqual({ time: game.time, name: 'Ada' })
  expect(now().bestTime.hinted['5.0']).toEqual({ time: 999, name: 'Anonymous' })
  wired.resetBestTime()
  expect(localStorage.getItem('nonograms.5.0')).toBe(null)
})

it('remembers the rain glyph choice and opens the help boxes', () => {
  wired.toggleRain()
  expect(now().rain).toBe(true)
  expect(localStorage.getItem('nonograms.rain')).toBe('yes')
  wired.toggleRain()
  expect(now().rain).toBe(false)
  wired.toggleHowTo()
  expect(now().howTo).toBe(true)
  wired.toggleAbout()
  expect(now().about).toBe(true)
})
