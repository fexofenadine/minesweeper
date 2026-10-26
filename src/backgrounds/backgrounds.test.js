import { beforeEach, expect, it } from 'vitest'
import { backgroundFor, defaults, loadSettings, saveSettings } from '.'
import substrate from './substrate'

beforeEach(() => localStorage.clear())

it('maps only the animated themes to a background', () => {
  expect(backgroundFor('matrix')).toBe('matrix')
  expect(backgroundFor('nord')).toBe('substrate')
  expect(backgroundFor('classic')).toBe(null)
})

it('keeps the tuned matrix look as its defaults', () => {
  expect(defaults('matrix')).toEqual({
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
  const clears = (settings) => run(settings, 300).filter(([, , w]) => w === 160).length
  expect(clears({ maxCycles: 0 })).toBe(1)
  expect(clears({ maxCycles: 1000, growthDelay: 1 })).toBeGreaterThan(1)
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
  const count = (pixels) => {
    const context = recorder()
    const instance = substrate.create(context, { ...defaults('substrate'), maxCycles: 0 })
    instance.resize(160 * pixels, 120 * pixels, pixels)
    let now = performance.now()
    for (let n = 0; n < 40; n++) instance.frame((now += 20))
    return context.calls.filter(([, , , , alpha]) => alpha === 1).length
  }
  //twice the pixels each way draws about four times the crack pixels in the same time
  expect(count(2) / count(1)).toBeGreaterThan(3)
})
