import { h } from 'hyperapp'
import '../app.css'
import Winner from '../Winner'
import BackgroundSettings from '../shell/BackgroundSettings'
import Boss, { BossButton } from '../shell/Boss'
import { load, remove, save } from '../shell/storage'
import { listen, shellActions, shellState, shortcut } from '../shell/actions'
import Game, { running } from './Game'
import BestTimes from './BestTimes'
import Prompt from './Prompt'
import { allowed, levelNames } from './Menu'
import { EMPTY, emptyBoard, full, sizes, solved } from './rules'
import { findHint } from './hint'
import { deal } from './deal'
import { showRain } from './rain'
import About from './About'

//the saved size and level, medium 8x8 when missing or out of range
const loadChoice = () => {
  const saved = parseInt(load('takuzu.size'), 10)
  const n = sizes.includes(saved) ? saved : 8
  const level = parseInt(load('takuzu.level'), 10)
  if (!(level >= 0 && level < levelNames.length)) return { n, level: 1 }
  return { n, level: allowed(n, level) ? level : 2 }
}

//an empty board until the dealer answers
export const createGame = ({ n, level }) => ({
  n,
  level,
  givens: emptyBoard(n),
  solution: null,
  board: emptyBoard(n),
  history: [],
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

//best times by size and level, kept apart for games with and without hints
const timeKey = (n, level, hinted) => `takuzu.${n}.${level}${hinted ? '.hints' : ''}`

const eachSlot = (fn) =>
  sizes.flatMap((n) => levelNames.map((_, level) => fn(n, level, `${n}.${level}`)))

const bestTimes = (hinted) =>
  Object.fromEntries(
    eachSlot((n, level, slot) => {
      const key = timeKey(n, level, hinted)
      const time = parseInt(load(key), 10) || null
      return [slot, time && { time, name: load(`${key}.name`) || 'Anonymous' }]
    }),
  )

const clearBestTimes = (hinted) => {
  eachSlot((n, level) => {
    const key = timeKey(n, level, hinted)
    remove(key)
    remove(`${key}.name`)
  })
  return bestTimes(hinted)
}

//a click steps forward through these, a right click back
const cycle = [EMPTY, 0, 1]

let deals = 0

const prevent = (event) => {
  event.preventDefault()
  return false
}

//the clock starts on the first change or hint
const begin = (game, actions) => {
  if (game.start >= 0) return game
  game.raf = requestAnimationFrame(actions.tick)
  return { ...game, start: performance.now(), time: 1 }
}

//after a cell changes: a win, or a full board that isn't one
const changed = (game, board, history, actions) => {
  const next = { ...begin(game, actions), board, history }
  next.win = solved(board, next.n)
  if (next.win) {
    cancelAnimationFrame(next.raf)
    actions.win(next)
  }
  return { hint: null, prompt: !next.win && full(board), game: next }
}

export const state = {
  ...shellState(),
  hint: null,
  prompt: false,
  errors: Boolean(load('takuzu.errors')),
  rain: Boolean(load('takuzu.rain')),
  about: false,
  game: createGame(loadChoice()),
  winner: null,
  bestTime: null,
}

export const actions = {
  ...shellActions,
  init: () => (state, actions) => {
    window.addEventListener('keydown', actions.press)
    listen(actions)
    showRain(state.rain)
    actions.reset()
  },
  press: (event) => (state, actions) => {
    //undo is the one shortcut with a modifier
    const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.keyCode === 90) {
      if (typing || state.boss) return
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
      const level = allowed(n, asked) ? asked : 2
      save('takuzu.size', n)
      save('takuzu.level', level)
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
    ({ id, givens, solution }) =>
    ({ game }) => {
      if (game.deal !== id) return null
      return { game: { ...game, givens, solution, board: givens.slice(), dealing: false } }
    },
  play:
    ({ event, i }) =>
    ({ game }, actions) => {
      if (event.button !== 0 && event.button !== 2) return null
      if (game.dealing || game.paused || game.win || game.givens[i] !== EMPTY) return null
      const from = game.board[i]
      const board = game.board.slice()
      board[i] = cycle[(cycle.indexOf(from) + (event.button === 2 ? 2 : 1)) % 3]
      return changed(game, board, [...game.history, [i, from]], actions)
    },
  undo:
    () =>
    ({ game }, actions) => {
      if (!game.history.length || game.win || game.paused || game.dealing) return { menu: null }
      const [i, from] = game.history[game.history.length - 1]
      const board = game.board.slice()
      board[i] = from
      return { menu: null, ...changed(game, board, game.history.slice(0, -1), actions) }
    },
  hint:
    () =>
    ({ game }, actions) => {
      if (game.dealing || game.win || game.paused) return { menu: null }
      const { board, solution, n } = game
      return {
        menu: null,
        prompt: false,
        hint: findHint({ board, solution, n }),
        game: { ...begin(game, actions), hinted: true },
      }
    },
  //yes asks for a hint, no leaves the player to find the mistake
  answerPrompt: (yes) => (state, actions) => {
    if (yes) actions.hint()
    return { prompt: false }
  },
  toggleErrors: () => (state) => {
    save('takuzu.errors', state.errors ? '' : 'yes')
    return { menu: null, errors: !state.errors }
  },
  toggleRain: () => (state) => {
    save('takuzu.rain', state.rain ? '' : 'yes')
    showRain(!state.rain)
    return { menu: null, rain: !state.rain }
  },
  toggleAbout:
    () =>
    ({ about }) => ({ menu: null, about: !about }),
  //stop the clock and hide the board, only while a game is running
  pause:
    (paused) =>
    ({ game }, actions) => {
      const next = paused === undefined ? !game.paused : paused
      if (!running(game) || next === game.paused) return null
      if (!next) {
        game.raf = requestAnimationFrame(actions.tick)
        return {
          game: { ...game, paused: false, start: game.start + performance.now() - game.pausedAt },
        }
      }
      cancelAnimationFrame(game.raf)
      return { menu: null, game: { ...game, paused: true, pausedAt: performance.now() } }
    },
  tick:
    (now) =>
    ({ game }, actions) => {
      game.raf = requestAnimationFrame(actions.tick)
      const next = Math.floor((now - game.start) / 1000) + 1
      if (game.time === next) return null
      return { game: { ...game, time: next } }
    },
  win:
    ({ n, level, hinted, time }) =>
    () => {
      const key = timeKey(n, level, hinted)
      const best = parseInt(load(key), 10)
      if (best && best <= time) return null
      return {
        winner: {
          key,
          time,
          hinted,
          level: `${levelNames[level].toLowerCase()} ${n} × ${n}`,
          name: load('takuzu.name') || '',
        },
      }
    },
  changeWinner:
    (payload) =>
    ({ winner }) => ({
      winner: { ...winner, ...payload },
    }),
  submitBestTime:
    (event) =>
    ({ winner }, actions) => {
      event.preventDefault()
      const name = winner.name.trim()
      save(winner.key, winner.time)
      save(`${winner.key}.name`, name)
      save('takuzu.name', name)
      actions.toggleBestTime()
      actions.setBestTimeTab(winner.hinted ? 'hinted' : 'clean')
      return { winner: null }
    },
  toggleBestTime:
    () =>
    ({ bestTime }) => ({
      menu: null,
      bestTime: bestTime
        ? null
        : { tab: 'clean', clean: bestTimes(false), hinted: bestTimes(true) },
    }),
  setBestTimeTab: (tab) => (state) =>
    state.bestTime ? { bestTime: { ...state.bestTime, tab } } : null,
  resetBestTime:
    () =>
    ({ bestTime }) => ({
      bestTime: { ...bestTime, [bestTime.tab]: clearBestTimes(bestTime.tab === 'hinted') },
    }),
}

export const view = (state, actions) => (
  <main oncontextmenu={prevent} ondragstart={prevent} oncreate={actions.init}>
    <Game key="a" state={state} actions={actions} />
    <BossButton key="h" actions={actions} />
    {state.winner && <Winner key="b" state={state.winner} actions={actions} />}
    {state.bestTime && <BestTimes key="c" state={state.bestTime} actions={actions} />}
    {state.prompt && <Prompt key="d" actions={actions} />}
    {state.backgroundSettings && (
      <BackgroundSettings key="e" state={state.backgroundSettings} actions={actions} />
    )}
    {state.about && <About key="f" actions={actions} />}
    {state.boss && <Boss key="g" state={state.boss} actions={actions} />}
  </main>
)
