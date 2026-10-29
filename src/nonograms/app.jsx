import { h } from 'hyperapp'
import '../app.css'
import Winner from '../Winner'
import BackgroundSettings from '../shell/BackgroundSettings'
import Boss, { BossButton } from '../shell/Boss'
import { load, save } from '../shell/storage'
import { records } from '../shell/records'
import BestTimes from '../shell/BestTimes'
import Prompt from '../shell/Prompt'
import { showRain } from '../shell/rain'
import { listen, shellActions, shellState, shortcut, typing } from '../shell/actions'
import { pauseAction } from '../shell/clock'
import Game, { running } from './Game'
import { CROSS, EMPTY, FILL, emptyBoard, fillsLeft, sizes, solved } from './rules'
import { deal } from './deal'
import { completeWithErrors, findHint } from './hint'
import { allowed, fallback, levelNames } from './Menu'
import About from './About'
import HowToPlay from './HowToPlay'

//the saved size and level, easy 10x10 when missing or out of range
const loadChoice = () => {
  const saved = parseInt(load('nonograms.size'), 10)
  const n = sizes.includes(saved) ? saved : 10
  const level = parseInt(load('nonograms.level'), 10)
  if (!(level >= 0 && level < levelNames.length)) return { n, level: 0 }
  return { n, level: fallback(n, level) }
}

//an empty board with no clues until the dealer answers
export const createGame = ({ n, level }) => ({
  n,
  level,
  clues: Array.from({ length: 2 * n }, () => []),
  solution: null,
  board: emptyBoard(n),
  history: [],
  change: 0,
  stroke: null,
  dealing: true,
  deal: 0,
  start: -1,
  time: 0,
  raf: null,
  paused: false,
  pausedAt: 0,
  win: false,
  hinted: false,
})

const { actions: recordActions } = records('nonograms', sizes, levelNames)

//a click steps forward through these, a right click back
const cycle = [EMPTY, FILL, CROSS]

//a finished looking board waits this long before asking, when its last fill may be on its way
//to a cross
const ASK_AFTER = 2500

let deals = 0
let changes = 0

const prevent = (event) => {
  event.preventDefault()
  return false
}

//the clock starts on the first change
const begin = (game, actions) => {
  if (game.start >= 0) return game
  game.raf = requestAnimationFrame(actions.tick)
  return { ...game, start: performance.now(), time: 1 }
}

//after a stroke or undo: a win stops the clock, and any hint is out of date
//a board with all its fills placed that isn't solved asks about a hint, at once when settled,
//otherwise only if nothing changes for a moment
const changed = (game, board, history, actions, settled = false) => {
  const next = { ...game, board, history, change: ++changes }
  next.win = solved(board, next.n, next.clues)
  if (next.win) {
    cancelAnimationFrame(next.raf)
    actions.win(next)
  }
  const stuck = !next.win && fillsLeft(board, next.n, next.clues) === 0
  if (stuck && !settled) setTimeout(() => actions.ask(next.change), ASK_AFTER)
  return { hint: null, prompt: stuck && settled, game: next }
}

//the cells a stroke covers: the start cell, then a straight run along the row or column it
//first moved along, out to the cell the pointer is nearest
const span = ({ start, axis }, i, n) => {
  const [sx, sy] = [start % n, Math.floor(start / n)]
  const [x, y] = [i % n, Math.floor(i / n)]
  const cells = []
  if (axis === 'row') {
    for (let k = Math.min(sx, x); k <= Math.max(sx, x); k++) cells.push(sy * n + k)
  } else if (axis === 'column') {
    for (let k = Math.min(sy, y); k <= Math.max(sy, y); k++) cells.push(k * n + sx)
  } else {
    cells.push(start)
  }
  return cells
}

//the first cell's new value goes on every covered cell that had the start cell's old value,
//so a stroke of fills leaves crosses alone and shrinking it back unpaints
const paint = (stroke, i, n) => {
  const board = stroke.before.slice()
  for (const c of span(stroke, i, n)) if (board[c] === stroke.from) board[c] = stroke.to
  return board
}

//which way a stroke runs, settled by the first cell it moves to
const axisOf = (stroke, i, n) => {
  if (stroke.axis || i === stroke.start) return stroke.axis
  const dx = Math.abs((i % n) - (stroke.start % n))
  const dy = Math.abs(Math.floor(i / n) - Math.floor(stroke.start / n))
  return dx >= dy ? 'row' : 'column'
}

//the cell under a pointer, for strokes that leave the cell they started on
const cellAt = (event) => {
  const target = document.elementFromPoint?.(event.clientX, event.clientY)
  const cell = target && target.closest('[data-cell]')
  return cell ? Number(cell.dataset.cell) : -1
}

export const state = {
  ...shellState(),
  hint: null,
  prompt: false,
  errors: Boolean(load('nonograms.errors')),
  rain: Boolean(load('nonograms.rain')),
  //touch screens have no right click, so a tap fills or crosses as this says
  touch: Boolean(window.matchMedia && matchMedia('(pointer: coarse)').matches),
  mode: FILL,
  about: false,
  game: createGame(loadChoice()),
  winner: null,
  bestTime: null,
}

export const actions = {
  ...shellActions,
  init: () => (state, actions) => {
    window.addEventListener('keydown', actions.press)
    window.addEventListener('pointermove', (event) => {
      const i = cellAt(event)
      if (i >= 0) actions.drag(i)
    })
    window.addEventListener('pointerup', () => actions.up())
    window.addEventListener('pointercancel', () => actions.up())
    listen(actions)
    showRain(state.rain)
    actions.reset()
  },
  press: (event) => (state, actions) => {
    //undo is the one shortcut with a modifier
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.keyCode === 90) {
      if (typing(event) || state.boss) return
      event.preventDefault()
      actions.undo()
      return
    }
    const key = shortcut(event, state, actions)
    if (key === 113 || key === 78) {
      actions.reset()
    } else if (key === 72) {
      actions.hint()
    } else if (key === 80) {
      actions.pause()
    }
  },
  //deals a new board, keeping the size and level unless given
  reset:
    (payload) =>
    ({ game }, actions) => {
      cancelAnimationFrame(game.raf)
      const n = (payload && payload.n) || game.n
      const asked = payload && payload.level !== undefined ? payload.level : game.level
      const level = fallback(n, asked)
      save('nonograms.size', n)
      save('nonograms.level', level)
      const id = ++deals
      deal(n, level, Math.floor(Math.random() * 2 ** 32)).then((dealt) =>
        actions.dealt({ id, ...dealt }),
      )
      return {
        menu: null,
        hint: null,
        prompt: false,
        game: { ...createGame({ n, level }), deal: id },
      }
    },
  //an answer for an older deal is dropped
  dealt:
    ({ id, clues, solution }) =>
    ({ game }) => {
      if (game.deal !== id) return null
      return { game: { ...game, clues, solution, dealing: false } }
    },
  //a press starts a stroke
  down:
    ({ event, i }) =>
    ({ game, mode }, actions) => {
      if (event.button !== 0 && event.button !== 2) return null
      if (game.dealing || game.paused || game.win || game.stroke) return null
      const touch = event.pointerType === 'touch'
      const from = game.board[i]
      let to = cycle[(cycle.indexOf(from) + (event.button === 2 ? 2 : 1)) % 3]
      if (touch) to = from === mode ? EMPTY : mode
      const stroke = { start: i, from, to, axis: null, before: game.board, touch }
      return {
        ...(touch && { touch }),
        game: { ...begin(game, actions), stroke, board: paint(stroke, i, game.n) },
      }
    },
  drag:
    (i) =>
    ({ game }) => {
      const { stroke, n } = game
      if (!stroke) return null
      const next = { ...stroke, axis: axisOf(stroke, i, n) }
      const board = paint(next, i, n)
      if (board.every((v, c) => v === game.board[c])) return null
      return { game: { ...game, stroke: next, board } }
    },
  //a stroke is one undo step, and the board is only judged once it ends
  //only a single mouse click that fills may still be on its way to a cross
  up:
    () =>
    ({ game }, actions) => {
      const { stroke, board } = game
      if (!stroke) return null
      const step = [...board.keys()]
        .filter((c) => board[c] !== stroke.before[c])
        .map((c) => [c, stroke.before[c]])
      const history = step.length ? [...game.history, step] : game.history
      const passing =
        step.length === 1 && stroke.from === EMPTY && stroke.to === FILL && !stroke.touch
      return changed({ ...game, stroke: null }, board, history, actions, !passing)
    },
  undo:
    () =>
    ({ game }, actions) => {
      if (!game.history.length || game.win || game.paused || game.dealing || game.stroke) {
        return { menu: null }
      }
      const board = game.board.slice()
      for (const [c, from] of game.history[game.history.length - 1]) board[c] = from
      return { menu: null, ...changed(game, board, game.history.slice(0, -1), actions) }
    },
  //the delayed question, dropped if the board changed or the game moved on meanwhile
  ask:
    (change) =>
    ({ game }) => {
      if (game.change !== change || game.win || game.paused || game.stroke) return null
      return { prompt: fillsLeft(game.board, game.n, game.clues) === 0 }
    },
  hint:
    () =>
    ({ game }, actions) => {
      if (game.dealing || game.win || game.paused || game.stroke) return { menu: null }
      const { board, solution, clues, n } = game
      return {
        menu: null,
        prompt: false,
        hint: findHint({ board, solution, clues, n }),
        game: { ...begin(game, actions), hinted: true },
      }
    },
  //yes asks for a hint, no leaves the player to find the mistake
  answerPrompt: (yes) => (state, actions) => {
    if (yes) actions.hint()
    return { prompt: false }
  },
  setMode: (mode) => ({ mode }),
  toggleErrors: () => (state) => {
    save('nonograms.errors', state.errors ? '' : 'yes')
    return { menu: null, errors: !state.errors }
  },
  toggleRain: () => (state) => {
    save('nonograms.rain', state.rain ? '' : 'yes')
    showRain(!state.rain)
    return { menu: null, rain: !state.rain }
  },
  toggleAbout:
    () =>
    ({ about }) => ({ menu: null, about: !about }),
  //a half done stroke is kept as it is
  pause: pauseAction(running),
  tick:
    (now) =>
    ({ game }, actions) => {
      game.raf = requestAnimationFrame(actions.tick)
      const next = Math.floor((now - game.start) / 1000) + 1
      if (game.time === next) return null
      return { game: { ...game, time: next } }
    },
  ...recordActions,
}

export const view = (state, actions) => (
  <main oncontextmenu={prevent} ondragstart={prevent} oncreate={actions.init}>
    <Game key="a" state={state} actions={actions} />
    <BossButton key="h" actions={actions} />
    {state.winner && <Winner key="b" state={state.winner} actions={actions} />}
    {state.bestTime && (
      <BestTimes
        key="c"
        title="Fastest Nonogram Solvers"
        sizes={sizes}
        levelNames={levelNames}
        allowed={allowed}
        state={state.bestTime}
        actions={actions}
      />
    )}
    {state.prompt && (
      <Prompt key="d" title="Nonograms" text={completeWithErrors} actions={actions} />
    )}
    {state.backgroundSettings && (
      <BackgroundSettings key="e" state={state.backgroundSettings} actions={actions} />
    )}
    {state.about && <About key="f" actions={actions} />}
    {state.howTo && <HowToPlay key="i" actions={actions} />}
    {state.boss && <Boss key="g" state={state.boss} actions={actions} />}
  </main>
)
