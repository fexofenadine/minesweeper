import { load, save } from '../storage'
import matrix from './matrix'
import substrate from './substrate'

//animated xscreensaver ports drawn on a canvas behind the game
//a background declares its options, ratio(devicePixelRatio) for its canvas resolution,
//an optional filter(devicePixelRatio) for css effects, and a create(context, settings)
//that returns { configure(settings), resize(width, height, scale), frame(now) }, then gets listed here
export const backgrounds = { matrix, substrate }

//which theme shows which background
const themeBackgrounds = { matrix: 'matrix', nord: 'substrate' }

export const backgroundFor = (theme) => themeBackgrounds[theme] || null

export const defaults = (id) =>
  Object.fromEntries(backgrounds[id].options.map((option) => [option.key, option.value]))

//keeps a stored value only if it still fits the option, so old or edited settings cannot break a background
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
    Object.entries(backgrounds).map(([id, { options }]) => [
      id,
      Object.fromEntries(
        options.map((option) => [option.key, clean(option, stored[id]?.[option.key])]),
      ),
    ]),
  )
}

export const saveSettings = (settings) => save('backgrounds', JSON.stringify(settings))

let settings = loadSettings()
const instances = {}

//apply settings to a background straight away, for live previews and after saving
export const configure = (id, values) => {
  settings = { ...settings, [id]: values }
  instances[id]?.configure(values)
}

export const startBackgrounds = () => {
  const root = document.documentElement
  const canvas = document.createElement('canvas')
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:none'
  document.body.prepend(canvas)
  const context = canvas.getContext('2d')

  let active = null
  let frame = null

  const loop = (now) => {
    frame = requestAnimationFrame(loop)
    instances[active].frame(now)
  }

  //draw at the display's own pixels, as far as the background allows, so it stays sharp
  const resize = () => {
    const { ratio, filter } = backgrounds[active]
    const pixels = window.devicePixelRatio || 1
    const scale = ratio(pixels)
    canvas.width = Math.round(innerWidth * scale)
    canvas.height = Math.round(innerHeight * scale)
    canvas.style.filter = filter ? filter(pixels) : 'none'
    instances[active].resize(canvas.width, canvas.height, scale)
  }

  //browser zoom and moving to another screen change the pixel ratio, sometimes without a resize
  const watchPixels = () => {
    matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`).addEventListener(
      'change',
      () => {
        if (active) resize()
        watchPixels()
      },
      { once: true },
    )
  }

  const update = () => {
    const id = backgroundFor(root.dataset.theme)
    if (id === active) return
    cancelAnimationFrame(frame)
    active = id
    canvas.style.display = id ? 'block' : 'none'
    if (!id) return
    instances[id] ??= backgrounds[id].create(context, settings[id])
    resize()
    frame = requestAnimationFrame(loop)
  }

  new MutationObserver(update).observe(root, { attributes: true, attributeFilter: ['data-theme'] })
  window.addEventListener('resize', () => active && resize())
  watchPixels()
  update()
}
