import { h } from 'hyperapp'
import './app.css'
import Game from './Game'
import Winner from './Winner'
import BestTime from './BestTime'
import CustomField from './CustomField'
import { placeMines } from './mines'
import { findHint, noHint } from './hint'
import { load, save, remove } from './storage'

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
}

const levelNames = Object.keys(levels)

const themes = ['classic', 'synthwave', 'solarized', 'matrix']

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

const loadTheme = () => {
  const theme = load('theme')
  return themes.includes(theme) ? theme : 'classic'
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
  menu: null,
  hint: null,
  game: createGame(loadLevel()),
  marks: Boolean(load('marks')),
  safeStart: load('safeStart') !== 'off',
  noGuess: Boolean(load('noGuess')),
  theme: loadTheme(),
  winner: null,
  bestTime: null,
  customField: null,
}

export const actions = {
  init: () => (state, actions) => {
    window.addEventListener('keydown', actions.press)
  },
  press: (event) => (state, actions) => {
    //leave typing in a dialog and browser shortcuts alone
    if (event.target.tagName === 'INPUT' || event.ctrlKey || event.metaKey || event.altKey) return
    if (event.keyCode === 113 || event.keyCode === 78) {
      actions.reset()
    } else if (event.keyCode === 72) {
      actions.hint()
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
  hint:
    () =>
    ({ game }) => {
      if (game.win || game.lose) return { menu: null }
      if (game.start < 0) {
        return { menu: null, hint: noHint('Open a cell first, then ask for a hint.') }
      }
      const { field, width, height, flags } = game
      return {
        menu: null,
        hint: findHint({ field, width, height, minesLeft: flags }),
        game: { ...game, hinted: true },
      }
    },
  touch:
    ({ event, x, y }) =>
    ({ game }, actions) => {
      if (game.win || game.lose) return null
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
        hint: null,
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
      const { pressedX, pressedY, field, flags } = game
      if (pressedX < 0 || pressedY < 0) return null
      const cell = field[pressedY][pressedX]
      if (cell.opened) return null
      const nextField = game.field.slice()
      nextField[pressedY] = nextField[pressedY].slice()
      const nextCell = {
        ...cell,
        flag: marks ? !cell.mark && !cell.flag : !cell.flag,
        mark: marks && cell.flag,
      }
      nextField[pressedY][pressedX] = nextCell
      const mines = cell.flag === nextCell.flag ? flags : flags + (nextCell.flag ? -1 : 1)
      return {
        game: {
          ...game,
          field: nextField,
          flags: mines,
          pressedX: -1,
          pressedY: -1,
        },
      }
    },
  down:
    ({ event, x, y }) =>
    ({ game, marks }, actions) => {
      if (game.touch || event.button > 2 || game.win || game.lose) return null
      window.addEventListener('mouseup', actions.up)
      let { field, flags } = game
      const cell = field[y][x]
      if (!game.pressed && event.button === 2 && !field[y][x].opened) {
        field = field.slice()
        field[y] = field[y].slice()
        const nextCell = {
          ...cell,
          flag: marks ? !cell.mark && !cell.flag : !cell.flag,
          mark: marks && cell.flag,
        }
        field[y][x] = nextCell
        flags = cell.flag === nextCell.flag ? flags : flags + (nextCell.flag ? -1 : 1)
      }
      return {
        hint: null,
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
      if (game.win || game.lose || !openable(game, x, y)) return null
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
      if (game.win || game.lose || pressedX < 0 || pressedY < 0) {
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

      //mines are only placed once a cell is actually opened
      //a flag or chord first must not pick the start cell for safe start or no guessing
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

      if (game.group) {
        if (cell.opened) {
          const flags = calcNear(pressedX, pressedY, (c) => c.flag)
          if (flags === cell.num) {
            left -= revealRange(pressedX, pressedY, reveal)
          }
        }
      } else if (game.pressed) {
        left -= reveal(pressedX, pressedY)
      }

      const win = left <= 0
      if (win || lose) {
        cancelAnimationFrame(game.raf)
        if (!lose) actions.win()
      }

      return {
        hint: null,
        game: {
          ...game,
          left,
          field,
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
  setTheme: (theme) => () => {
    save('theme', theme)
    document.documentElement.dataset.theme = theme
    return {
      menu: null,
      theme,
    }
  },
  toggleMenu:
    (event) =>
    ({ menu }) => {
      const { name } = event.currentTarget.dataset
      if (event.type === 'click') {
        return { menu: menu && menu[name] ? null : { [name]: true } }
      }
      if (event.type === 'mouseenter') {
        return menu ? { menu: { [name]: true } } : null
      }
      if (event.type === 'focusout' && !event.currentTarget.contains(event.relatedTarget)) {
        return { menu: null }
      }
      return null
    },
}

export const view = (state, actions) => (
  <main oncontextmenu={prevent} ondragstart={prevent} oncreate={actions.init}>
    {state.game && <Game key="a" state={state} actions={actions} />}
    {state.winner && <Winner key="b" state={state.winner} actions={actions} />}
    {state.bestTime && <BestTime key="c" state={state.bestTime} actions={actions} />}
    {state.customField && <CustomField key="d" state={state.customField} actions={actions} />}
  </main>
)
