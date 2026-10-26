import { beforeEach, expect, it } from 'vitest'
import { backgroundFor, defaults, loadSettings, saveSettings } from '.'
import substrate from './substrate'
import truchet from './truchet'
import phosphor, { loadTexts } from './phosphor'
import { pixel } from './font6x10'
import hill, { hillLayout, noise } from './hill'

beforeEach(() => localStorage.clear())

it('maps only the animated themes to a background', () => {
  expect(backgroundFor('matrix')).toBe('matrix')
  expect(backgroundFor('nord')).toBe('substrate')
  expect(backgroundFor('solarized')).toBe('truchet')
  expect(backgroundFor('solarized-phosphor')).toBe('phosphor')
  expect(backgroundFor('classic')).toBe('hill')
  expect(backgroundFor('synthwave')).toBe(null)
})

it('keeps the tuned matrix look as its defaults', () => {
  expect(defaults('matrix')).toEqual({
    animated: true,
    density: 44,
    speed: 1,
    encoding: 'matrix',
    fog: true,
    waves: true,
  })
})

it('stores every background together and repairs bad values', () => {
  localStorage.setItem(
    'backgrounds',
    JSON.stringify({
      matrix: { density: 500, encoding: 'nope', fog: 'yes' },
      substrate: { sandGrains: 10 },
    }),
  )
  const settings = loadSettings()
  expect(settings.matrix.density).toBe(100)
  expect(settings.matrix.encoding).toBe('matrix')
  expect(settings.matrix.fog).toBe(true)
  expect(settings.substrate.sandGrains).toBe(10)
  expect(settings.substrate.maxCracks).toBe(100)
  saveSettings(settings)
  expect(Object.keys(JSON.parse(localStorage.getItem('backgrounds')))).toEqual([
    'matrix',
    'substrate',
    'truchet',
    'phosphor',
    'hill',
  ])
})

it('falls back to the defaults when the stored settings are unreadable', () => {
  localStorage.setItem('backgrounds', '{oops')
  expect(loadSettings().substrate).toEqual(defaults('substrate'))
})

//records what substrate draws instead of painting it
const recorder = () => {
  const calls = []
  return {
    calls,
    globalAlpha: 1,
    fillStyle: '',
    fillRect(x, y, w, h) {
      calls.push([x, y, w, h, this.globalAlpha])
    },
  }
}

const run = (settings, frames, width = 160, height = 120) => {
  const context = recorder()
  const instance = substrate.create(context, { ...defaults('substrate'), ...settings })
  instance.resize(width, height)
  let now = performance.now()
  for (let n = 0; n < frames; n++) instance.frame((now += 20))
  return context.calls
}

it('grows cracks and sand inside the canvas', () => {
  const calls = run({}, 400)
  const points = calls.filter(([, , w]) => w === 1)
  expect(points.length).toBeGreaterThan(1000)
  expect(points.every(([x, y]) => x >= 0 && x < 160 && y >= 0 && y < 120)).toBe(true)
})

it('starts over after the set number of cycles', () => {
  const clears = (settings) => {
    const context = counter()
    const small = { sandGrains: 8, maxCracks: 20, growthDelay: 1 }
    const instance = substrate.create(context, { ...defaults('substrate'), ...small, ...settings })
    instance.resize(160, 120, 1)
    let now = performance.now()
    for (let n = 0; n < 300; n++) instance.frame((now += 20))
    return context.counts.clears
  }
  expect(clears({ maxCycles: 0 })).toBe(1)
  expect(clears({ maxCycles: 1000 })).toBeGreaterThan(1)
})

it('keeps working with every option at its extremes', () => {
  for (const option of substrate.options.filter((o) => o.type === 'range')) {
    for (const value of [option.min, option.max]) {
      expect(() => run({ [option.key]: value, seamless: true }, 30, 60, 40)).not.toThrow()
    }
  }
  //wireframe draws the cracks alone, with no translucent sand
  const points = run({ wireframe: true }, 200).filter(([, , w]) => w === 1)
  expect(points.length).toBeGreaterThan(0)
  expect(points.every(([, , , , alpha]) => alpha === 1)).toBe(true)
})

it('grows at the same pace per screen area on a denser display', () => {
  //a fixed set of cracks without sand, so only the number of cycles differs
  const fixed = { maxCycles: 0, initialCracks: 11, maxCracks: 11, wireframe: true }
  const count = (pixels) => {
    const context = counter()
    const instance = substrate.create(context, { ...defaults('substrate'), ...fixed })
    instance.resize(160 * pixels, 120 * pixels, pixels)
    let now = performance.now()
    for (let n = 0; n < 40; n++) instance.frame((now += 20))
    return context.counts.fillRect
  }
  //twice the pixels each way runs four times the cycles in the same time
  expect(count(2) / count(1)).toBeGreaterThan(3.5)
})

it('gives every background an animated switch, on by default except classic', () => {
  for (const id of ['matrix', 'substrate', 'truchet', 'phosphor'])
    expect(defaults(id).animated).toBe(true)
  //classic keeps the original game's look unless the hill is turned on
  expect(defaults('hill').animated).toBe(false)
})

//a canvas context that only counts what is drawn
const counter = () => {
  const counts = {}
  return new Proxy(
    {
      counts,
      createLinearGradient: () => ({ addColorStop: () => {} }),
      getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    },
    {
      get: (target, key) =>
        key in target
          ? target[key]
          : (...args) => {
              counts[key] = (counts[key] || 0) + 1
              //a fill wider than a pixel is a clear of the whole picture
              if (key === 'fillRect' && args[2] > 1) counts.clears = (counts.clears || 0) + 1
            },
      set: () => true,
    },
  )
}

it('draws truchet tiles and scrolls them, then lays down a new pattern', () => {
  const context = counter()
  const instance = truchet.create(context, { ...defaults('truchet'), animDelay: 10, animStep: 9 })
  instance.resize(320, 200, 1)
  const drawn = context.counts.ellipse || context.counts.lineTo
  expect(drawn).toBeGreaterThan(0)
  let now = performance.now()
  for (let n = 0; n < 200; n++) instance.frame((now += 20))
  expect(context.counts.stroke).toBeGreaterThan(100)
  expect(instance.still()).toBe(true)
})

it('draws straight truchet tiles only when curves are off', () => {
  const context = counter()
  truchet.create(context, { ...defaults('truchet'), curves: false }).resize(320, 200, 1)
  expect(context.counts.ellipse).toBeUndefined()
  expect(context.counts.lineTo).toBeGreaterThan(0)
})

it('has the 6x10 font glyphs', () => {
  const rows = (c) =>
    Array.from({ length: 10 }, (_, y) =>
      Array.from({ length: 7 }, (_, x) => (pixel(c.charCodeAt(0), x, y) ? '#' : '.')).join(''),
    )
  expect(rows('A').slice(1, 8)).toEqual([
    '...#...',
    '..#.#..',
    '.#...#.',
    '.#...#.',
    '.#####.',
    '.#...#.',
    '.#...#.',
  ])
  expect(rows(' ').join('')).not.toContain('#')
})

it('types the game source into phosphor and fades it', async () => {
  const files = await loadTexts()
  expect(files.some(({ name }) => name === 'src/mines.js')).toBe(true)
  expect(files.some(({ name }) => name.includes('.test.'))).toBe(false)
  const context = counter()
  const instance = phosphor.create(context, { ...defaults('phosphor'), delay: 10 })
  instance.resize(600, 400, 1)
  let now = performance.now()
  for (let n = 0; n < 50; n++) instance.frame((now += 80))
  await new Promise((resolve) => setTimeout(resolve, 10))
  for (let n = 0; n < 50; n++) instance.frame((now += 80))
  expect(context.counts.stroke).toBeGreaterThan(50)
})

it('grows a whole substrate picture for the still background, then stops', () => {
  const context = counter()
  const small = { maxCycles: 300, maxCracks: 20, sandGrains: 8 }
  const instance = substrate.create(context, { ...defaults('substrate'), ...small })
  instance.resize(160, 120, 1)
  let done = false
  let calls = 0
  while (!done && calls++ < 1000) done = instance.still(performance.now())
  expect(done).toBe(true)
  //the picture is blended in memory and put on the canvas, not drawn a grain at a time
  expect(context.counts.putImageData).toBeGreaterThan(0)
  expect(context.counts.fillRect).toBe(1)
  //finished pictures stay put
  const puts = context.counts.putImageData
  expect(instance.still(performance.now())).toBe(true)
  expect(context.counts.putImageData).toBe(puts)
})

it('puts the hill ridge where bliss has it and keeps the grass to the bottom', () => {
  for (const [w, h] of [
    [1920, 1080],
    [1280, 1024],
    [390, 844],
    [3840, 1200],
  ]) {
    const { x, y, w: hw, h: hh } = hillLayout(w, h)
    expect(y / h).toBeCloseTo(0.53)
    expect(y + hh).toBeGreaterThanOrEqual(h - 1)
    expect(hw).toBeGreaterThanOrEqual(w - 1)
    expect(x).toBeLessThanOrEqual(0)
  }
})

it('makes smooth noise between 0 and 1', () => {
  const values = Array.from({ length: 200 }, (_, i) => noise(i * 0.37, i * 0.11, 3))
  expect(Math.min(...values)).toBeGreaterThanOrEqual(0)
  expect(Math.max(...values)).toBeLessThanOrEqual(1)
  expect(Math.abs(noise(1.5, 2.5, 1) - noise(1.501, 2.5, 1))).toBeLessThan(0.01)
})

it('draws the sky every frame and drifts the clouds', () => {
  const context = counter()
  const instance = hill.create(context, { ...defaults('hill'), animated: true })
  instance.resize(800, 600, 1)
  let now = performance.now()
  for (let n = 0; n < 30; n++) instance.frame((now += 16))
  expect(context.counts.fillRect).toBeGreaterThanOrEqual(31)
})
