import { load, save } from '../storage'
import matrix from './matrix'
import substrate from './substrate'
import truchet from './truchet'
import phosphor from './phosphor'
import hill from './hill'

//canvas backgrounds behind the game, each one
//{ name, credit, options, ratio(dpr, settings), filter?(dpr), wallpaper?, animated?, create(context, settings) }
//where create returns { configure, resize(w, h, scale), frame(now), still?(now) }
export const backgrounds = { matrix, substrate, truchet, phosphor, hill }

//which theme shows which background
const themeBackgrounds = {
  classic: 'hill',
  matrix: 'matrix',
  nord: 'substrate',
  solarized: 'truchet',
  'solarized-phosphor': 'phosphor',
}

export const backgroundFor = (theme) => themeBackgrounds[theme] || null

//every background can be switched off
export const optionsOf = (id) => [
  { key: 'animated', label: 'Animated', type: 'toggle', value: backgrounds[id].animated ?? true },
  ...backgrounds[id].options,
]

export const defaults = (id) =>
  Object.fromEntries(optionsOf(id).map((option) => [option.key, option.value]))

//keep a stored value only if it still fits its option
const clean = (option, value) => {
  if (option.type === 'toggle') return typeof value === 'boolean' ? value : option.value
  if (option.type === 'select') {
    return option.choices.some(([choice]) => choice === value) ? value : option.value
  }
  const number = Number(value)
  if (value === null || value === '' || !Number.isFinite(number)) return option.value
  return Math.min(option.max, Math.max(option.min, number))
}

//every background's settings live together under one key, used or not
export const loadSettings = () => {
  let stored = {}
  try {
    stored = JSON.parse(load('backgrounds')) || {}
  } catch {
    //unreadable settings fall back to the defaults
  }
  return Object.fromEntries(
    Object.keys(backgrounds).map((id) => [
      id,
      Object.fromEntries(
        optionsOf(id).map((option) => [option.key, clean(option, stored[id]?.[option.key])]),
      ),
    ]),
  )
}

export const saveSettings = (settings) => save('backgrounds', JSON.stringify(settings))

let settings = loadSettings()
const instances = {}
let refresh = () => {}

//apply settings now, for previews and after saving
export const configure = (id, values) => {
  settings = { ...settings, [id]: values }
  instances[id]?.configure(values)
  refresh(id)
}

export const startBackgrounds = () => {
  const root = document.documentElement
  const canvas = document.createElement('canvas')
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:none'
  document.body.prepend(canvas)
  const context = canvas.getContext('2d')

  let active = null
  //animated, still or wallpaper
  let mode = null
  let frame = null

  const loop = (now) => {
    frame = requestAnimationFrame(loop)
    instances[active].frame(now)
  }

  const settle = (now) => {
    if (!instances[active].still(now)) frame = requestAnimationFrame(settle)
  }

  //draw at the display's pixels, as far as the background allows
  const resize = () => {
    const { ratio, filter } = backgrounds[active]
    const pixels = window.devicePixelRatio || 1
    const scale = ratio(pixels, settings[active])
    canvas.width = Math.round(innerWidth * scale)
    canvas.height = Math.round(innerHeight * scale)
    canvas.style.filter = filter ? filter(pixels) : 'none'
    instances[active].resize(canvas.width, canvas.height, scale)
  }

  const start = () => {
    cancelAnimationFrame(frame)
    if (mode === 'wallpaper') return
    resize()
    frame = requestAnimationFrame(mode === 'animated' ? loop : settle)
  }

  //zoom or a new screen can change the pixel ratio without a resize
  const watchPixels = () => {
    matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`).addEventListener(
      'change',
      () => {
        if (active) start()
        watchPixels()
      },
      { once: true },
    )
  }

  const update = (changed) => {
    const id = backgroundFor(root.dataset.theme)
    const still = backgrounds[id]?.wallpaper ? 'wallpaper' : 'still'
    const next = id && (settings[id].animated ? 'animated' : still)
    //the css shows a theme's wallpaper unless the canvas covers it
    if (next) root.dataset.background = next
    else delete root.dataset.background
    if (id === active && next === mode && changed !== id) return
    cancelAnimationFrame(frame)
    active = id
    mode = next
    canvas.style.display = id && mode !== 'wallpaper' ? 'block' : 'none'
    if (!id) return
    instances[id] ??= backgrounds[id].create(context, settings[id])
    start()
  }

  refresh = update
  new MutationObserver(() => update()).observe(root, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  window.addEventListener('resize', () => active && start())
  watchPixels()
  update()
}
