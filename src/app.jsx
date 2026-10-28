import { h } from 'hyperapp'
import './app.css'
import Game, { transposed } from './Game'
import Winner from './Winner'
import BestTime from './BestTime'
import CustomField from './CustomField'
import BackgroundSettings from './shell/BackgroundSettings'
import About from './About'
import Boss, { BossButton } from './shell/Boss'
import { placeMines } from './mines'
import { explainChord, findHint, noHint } from './hint'
import { load, save, remove } from './shell/storage'
import { listen, shellActions, shellState, shortcut } from './shell/actions'

const levels = {
  beginner: {
    level: 'beginner',
    width: 9,
    height: 9,
    mines: 10,
  },
  intermediate: {
    level: 'intermediate',
    width: 16,
    height: 16,
    mines: 40,
  },
  expert: {
    level: 'expert',
    width: 30,
    height: 16,
    mines: 99,
  },
  //expert grown by 30% each way at the same mine density
  extreme: {
    level: 'extreme',
    width: 39,
    height: 21,
    mines: 169,
  },
}

const levelNames = Object.keys(levels)

const createGame = ({ level, width, height, mines }) => {
  const field = new Array(height)
  for (let y = 0; y < height; y++) {
    field[y] = new Array(width)
    for (let x = 0; x < width; x++) {
      field[y][x] = {
        opened: false,
        mined: false,
        flag: false,
        mark: false,
        num: 0,
      }
    }
  }
  return {
    level,
    width,
    height,
    mines,
    field,
    left: width * height - mines,
    pressed: false,
    pressedX: -1,
    pressedY: -1,
    group: false,
    flags: mines,
    start: -1,
    time: 0,
    raf: null,
    lose: false,
    win: false,
    touch: false,
    hinted: false,
    paused: false,
    pausedAt: 0,
    openedAt: { x: -1, y: -1, time: 0 },
  }
}

const openable = (game, x, y) => {
  const cell = game.field[y][x]
  if (cell.opened) {
    let num = 0
    for (let offsetX = -1; offsetX <= 1; offsetX++) {
      for (let offsetY = -1; offsetY <= 1; offsetY++) {
        const dx = offsetX + x
        const dy = offsetY + y
        if (dx >= 0 && dy >= 0 && dx < game.width && dy < game.height) {
          num += game.field[dy][dx].flag ? 1 : 0
        }
      }
    }
    return num === cell.num
  }
  return false
}

//flag, question mark (with marks on) or clear, and the new mine count
const toggleFlag = (game, x, y, marks) => {
  const cell = game.field[y][x]
  const field = game.field.slice()
  field[y] = field[y].slice()
  field[y][x] = {
    ...cell,
    flag: marks ? !cell.mark && !cell.flag : !cell.flag,
    mark: marks && cell.flag,
  }
  const change = cell.flag === field[y][x].flag ? 0 : field[y][x].flag ? -1 : 1
  return { field, flags: game.flags + change }
}

const revealRange = (x, y, fn) =>
  fn(x - 1, y - 1) +
  fn(x - 1, y + 1) +
  fn(x + 1, y - 1) +
  fn(x + 1, y + 1) +
  fn(x - 1, y) +
  fn(x + 1, y) +
  fn(x, y - 1) +
  fn(x, y + 1)

const customLevel = (data, defaults) => {
  const width = Math.max(9, Math.min(40, parseInt(data.width, 10) || defaults.width))
  const height = Math.max(9, Math.min(30, parseInt(data.height, 10) || defaults.height))
  const mines = parseInt(data.mines, 10) || defaults.mines
  return {
    level: 'custom',
    width,
    height,
    mines: Math.max(10, Math.min(Math.floor(width * height * 0.8), mines)),
  }
}

const loadLevel = () => {
  const level = load('level')
  if (typeof level !== 'string') return levels.beginner
  if (levels[level]) return levels[level]
  const data = level.split(',')
  return customLevel({ width: data[0], height: data[1], mines: data[2] }, levels.beginner)
}

//best times are kept apart for games played with and without hints
const timeKey = (level, hinted) => (hinted ? `${level}Hints` : level)

const bestTimes = (hinted) =>
  levelNames.map((level) => {
    const key = timeKey(level, hinted)
    return {
      level,
      name: load(`${key}Name`) || 'Anonymous',
      time: Math.min(999, parseInt(load(key), 10) || 0) || 999,
    }
  })

const clearBestTimes = (hinted) => {
  levelNames.forEach((level) => {
    const key = timeKey(level, hinted)
    remove(key)
    remove(`${key}Name`)
  })
  return bestTimes(hinted)
}

const prevent = (event) => {
  event.preventDefault()
  return false
}

export const state = {
  ...shellState(),
  hint: null,
  game: createGame(loadLevel()),
  marks: Boolean(load('marks')),
  safeStart: load('safeStart') !== 'off',
  noGuess: Boolean(load('noGuess')),
  winner: null,
  bestTime: null,
  about: false,
  customField: null,
}

export const actions = {
  ...shellActions,
  init: () => (state, actions) => {
    window.addEventListener('keydown', actions.press)
    listen(actions)
  },
  press: (event) => (state, actions) => {
    const key = shortcut(event, state, actions)
    if (key === 113 || key === 78) {
      actions.reset()
    } else if (key === 72) {
      actions.hint()
    } else if (key === 80) {
      actions.pause()
    }
  },
  //stop the clock and hide the board, only while a game is running
  pause:
    (paused) =>
    ({ game }, actions) => {
      const next = paused === undefined ? !game.paused : paused
      if (game.start < 0 || game.win || game.lose || next === game.paused) return null
      if (!next) {
        game.raf = requestAnimationFrame(actions.tick)
        return {
          game: { ...game, paused: false, start: game.start + performance.now() - game.pausedAt },
        }
      }
      cancelAnimationFrame(game.raf)
      window.removeEventListener('mouseup', actions.up)
      return {
        menu: null,
        game: {
          ...game,
          paused: true,
          pausedAt: performance.now(),
          pressed: false,
          group: false,
          pressedX: -1,
          pressedY: -1,
        },
      }
    },
  reset:
    (payload) =>
    ({ game }) => {
      cancelAnimationFrame(game.raf)
      const params = (payload && levels[payload.level]) || payload || game
      save(
        'level',
        params.level === 'custom'
          ? [params.width, params.height, params.mines].join()
          : params.level,
      )
      return {
        menu: null,
        hint: null,
        game: createGame(params),
      }
    },
  hint: () => (state) => {
    const { game } = state
    if (game.win || game.lose || game.paused) return { menu: null }
    if (game.start < 0) {
      return { menu: null, hint: noHint('Open a cell first, then ask for a hint.') }
    }
    const { field, width, height, flags } = game
    return {
      menu: null,
      hint: findHint({ field, width, height, minesLeft: flags, transposed: transposed(state) }),
      game: { ...game, hinted: true },
    }
  },
  touch:
    ({ event, x, y }) =>
    ({ game }, actions) => {
      if (game.win || game.lose || game.paused) return null
      const rect = event.currentTarget.getBoundingClientRect()
      const timer = setTimeout(actions.flag, 600)
      const move = ({ touches }) => {
        if (
          !touches ||
          touches.length !== 1 ||
          touches[0].clientX < rect.left ||
          touches[0].clientX > rect.right ||
          touches[0].clientY < rect.top ||
          touches[0].clientY > rect.bottom
        ) {
          clearTimeout(timer)
          actions.move({ x: -1, y: -1 })
        }
      }
      const stop = ({ changedTouches }) => {
        clearTimeout(timer)
        window.removeEventListener('scroll', move)
        window.removeEventListener('touchmove', move)
        window.removeEventListener('touchend', stop)
        window.removeEventListener('touchcancel', stop)
        move({ touches: changedTouches })
        actions.up()
      }
      window.addEventListener('scroll', move)
      window.addEventListener('touchmove', move)
      window.addEventListener('touchend', stop)
      window.addEventListener('touchcancel', stop)
      return {
        game: {
          ...game,
          pressed: true,
          pressedX: x,
          pressedY: y,
          group: event.shiftKey || openable(game, x, y),
          touch: true,
        },
      }
    },
  flag:
    () =>
    ({ game, marks }) => {
      const { pressedX, pressedY } = game
      if (game.paused || pressedX < 0 || pressedY < 0 || game.field[pressedY][pressedX].opened) {
        return null
      }
      return {
        hint: null,
        game: {
          ...game,
          ...toggleFlag(game, pressedX, pressedY, marks),
          pressedX: -1,
          pressedY: -1,
        },
      }
    },
  down:
    ({ event, x, y }) =>
    ({ game, marks }, actions) => {
      if (game.touch || event.button > 2 || game.win || game.lose || game.paused) return null
      window.addEventListener('mouseup', actions.up)
      const flagging = !game.pressed && event.button === 2 && !game.field[y][x].opened
      const { field, flags } = flagging ? toggleFlag(game, x, y, marks) : game
      return {
        //a flag changes the board
        ...(field !== game.field && { hint: null }),
        game: {
          ...game,
          field,
          pressed: event.button !== 2,
          pressedX: x,
          pressedY: y,
          group: event.shiftKey || event.buttons > 2,
          flags,
        },
      }
    },
  chord:
    ({ x, y }) =>
    ({ game }, actions) => {
      if (game.win || game.lose || game.paused) return null
      if (!openable(game, x, y)) {
        //a double click that just opened this cell is no failed chord
        const { openedAt } = game
        const fresh =
          openedAt.x === x && openedAt.y === y && performance.now() - openedAt.time < 500
        return fresh ? null : { hint: explainChord(game, x, y) }
      }
      actions.aim({ x, y })
      actions.up()
      return null
    },
  aim:
    ({ x, y }) =>
    ({ game }) => ({
      game: { ...game, pressed: false, pressedX: x, pressedY: y, group: true },
    }),
  move:
    ({ x, y }) =>
    ({ game }) => {
      if (x === game.pressedX && y === game.pressedY) return null
      return {
        game: {
          ...game,
          pressedX: x,
          pressedY: y,
        },
      }
    },
  up:
    () =>
    ({ game, safeStart, noGuess }, actions) => {
      window.removeEventListener('mouseup', actions.up)
      const { width, height, pressedX, pressedY } = game
      if (game.win || game.lose || game.paused || pressedX < 0 || pressedY < 0) {
        if (!game.pressed && !game.group) return null
        return { game: { ...game, pressed: false, group: false } }
      }
      const field = game.field.map((row) => row.map((c) => ({ ...c })))
      const outBounds = (x, y) => x < 0 || y < 0 || x >= width || y >= height
      const calcNear = (x, y, fn) => {
        let num = 0
        for (let offsetX = -1; offsetX <= 1; offsetX++) {
          for (let offsetY = -1; offsetY <= 1; offsetY++) {
            if (!outBounds(offsetX + x, offsetY + y)) {
              num += fn(field[offsetY + y][offsetX + x]) ? 1 : 0
            }
          }
        }
        return num
      }

      let { left, lose } = game
      const reveal = (x, y) => {
        if (outBounds(x, y)) return 0
        const c = field[y][x]
        if (c.opened || c.flag) return 0
        c.opened = true
        c.num = calcNear(x, y, (i) => i.mined)
        if (c.mined) lose = true
        if (c.num) return 1
        return revealRange(x, y, reveal) + 1
      }

      //mines are placed on the first open, never on a flag or chord
      const begin = game.start < 0 && game.pressed && !game.group && !field[pressedY][pressedX].flag
      if (begin) {
        const { mined } = placeMines({
          width,
          height,
          mines: game.mines,
          x: pressedX,
          y: pressedY,
          safe: safeStart,
          noGuess,
        })
        field.forEach((row, y) => row.forEach((c, x) => (c.mined = mined[y * width + x] === 1)))
        game.raf = requestAnimationFrame(actions.tick)
      }

      const cell = field[pressedY][pressedX]
      const wasOpened = cell.opened
      let chordHint = null

      if (game.group) {
        if (cell.opened) {
          const flags = calcNear(pressedX, pressedY, (c) => c.flag)
          if (flags === cell.num) {
            left -= revealRange(pressedX, pressedY, reveal)
          } else {
            chordHint = explainChord({ field, width, height }, pressedX, pressedY)
          }
        }
      } else if (game.pressed) {
        //on touch screens a tap on a number is the chord
        if (game.touch && wasOpened) {
          chordHint = explainChord({ field, width, height }, pressedX, pressedY)
        }
        left -= reveal(pressedX, pressedY)
      }

      const win = left <= 0
      if (win || lose) {
        cancelAnimationFrame(game.raf)
        if (!lose) actions.win()
      }

      //keep explanations until the board changes, so it never moves mid double click
      const changed = left !== game.left || lose || begin
      return {
        ...((chordHint || changed) && { hint: chordHint }),
        game: {
          ...game,
          left,
          field,
          openedAt:
            !wasOpened && cell.opened
              ? { x: pressedX, y: pressedY, time: performance.now() }
              : game.openedAt,
          pressed: false,
          group: false,
          start: begin ? performance.now() : game.start,
          time: begin ? 1 : game.time,
          lose,
          win,
          touch: false,
        },
      }
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
    () =>
    ({ game }) => {
      if (game.level === 'custom') return null
      const time = parseInt(load(timeKey(game.level, game.hinted)), 10)
      if (time && time <= game.time) return null
      return {
        winner: {
          name: 'Anonymous',
          time: game.time,
          level: game.level,
          hinted: game.hinted,
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
      const key = timeKey(winner.level, winner.hinted)
      save(key, winner.time)
      save(`${key}Name`, winner.name.trim())
      actions.toggleBestTime()
      actions.setBestTimeTab(winner.hinted ? 'hinted' : 'clean')
      return { winner: null }
    },
  toggleAbout:
    () =>
    ({ about }) => ({ menu: null, about: !about }),
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
  toggleCustomField:
    () =>
    ({ game, customField }) => ({
      menu: null,
      customField: customField
        ? null
        : {
            width: String(game.width),
            height: String(game.height),
            mines: String(game.mines),
          },
    }),
  changeCustomField:
    (payload) =>
    ({ customField }) => ({
      customField: { ...customField, ...payload },
    }),
  submitCustomField:
    (event) =>
    ({ game, customField }, actions) => {
      event.preventDefault()
      actions.reset(customLevel(customField, game))
      return { customField: null }
    },
  toggleSafeStart: () => (state) => {
    const safeStart = !state.safeStart
    save('safeStart', safeStart ? '' : 'off')
    return { menu: null, safeStart }
  },
  toggleNoGuess: () => (state) => {
    const noGuess = !state.noGuess
    save('noGuess', noGuess ? 'yes' : '')
    return { menu: null, noGuess }
  },
  toggleMarks: () => (state) => {
    const marks = !state.marks
    save('marks', marks ? 'yes' : '')
    return {
      menu: null,
      marks,
    }
  },
}

export const view = (state, actions) => (
  <main oncontextmenu={prevent} ondragstart={prevent} oncreate={actions.init}>
    {state.game && <Game key="a" state={state} actions={actions} />}
    <BossButton key="h" actions={actions} />
    {state.winner && <Winner key="b" state={state.winner} actions={actions} />}
    {state.bestTime && <BestTime key="c" state={state.bestTime} actions={actions} />}
    {state.customField && <CustomField key="d" state={state.customField} actions={actions} />}
    {state.backgroundSettings && (
      <BackgroundSettings key="e" state={state.backgroundSettings} actions={actions} />
    )}
    {state.about && <About key="f" actions={actions} />}
    {state.boss && <Boss key="g" state={state.boss} actions={actions} />}
  </main>
)
