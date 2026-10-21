/* glmatrix, Copyright (c) 2003-2018 Jamie Zawinski <jwz@jwz.org>
 *
 * Permission to use, copy, modify, distribute, and sell this software and its
 * documentation for any purpose is hereby granted without fee, provided that
 * the above copyright notice appear in all copies and that both that
 * copyright notice and this permission notice appear in supporting
 * documentation.  No representations are made about the suitability of this
 * software for any purpose.  It is provided "as is" without express or
 * implied warranty.
 */

//canvas port of the strip, wave, fog and camera logic from xscreensaver's glmatrix.c

const GRID_SIZE = 70
const GRID_DEPTH = 35
const WAVE_SIZE = 22
const SPLASH_RATIO = 0.7
const STRIPS = 44
const TICK = 30

const glyphs = [...'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789']
const views = [
  [0, 0],
  [0, -20],
  [0, 20],
  [25, 0],
  [-25, 0],
  [25, 20],
  [-25, 20],
  [25, -20],
  [-25, -20],
  [10, 0],
  [-10, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
]

const frand = (n) => Math.random() * n
const bellrand = (n) => (frand(n) + frand(n) + frand(n)) / 3
const randomGlyph = () => Math.floor(Math.random() * glyphs.length) + 1

const ramp = Array.from({ length: WAVE_SIZE }, (_, i) => {
  const j = Math.sin((((WAVE_SIZE - i) / (WAVE_SIZE - 1)) * Math.PI) / 2)
  return 0.2 + j * 0.8
})

//glyph cells hold 0 for blank, n for glyph n, and -n for a glyph that keeps changing
const resetStrip = (s) => {
  s.x = frand(GRID_SIZE) - GRID_SIZE / 2
  s.y = GRID_SIZE / 2 + bellrand(0.5)
  s.z = GRID_DEPTH * 0.2 - frand(GRID_DEPTH * 0.7)
  s.dz = bellrand(0.02)
  s.erasing = false
  s.spinnerY = 0
  s.spinnerSpeed = bellrand(0.3)
  s.spinnerGlyph = -randomGlyph()
  s.spinSpeed = Math.floor(bellrand(2)) + 1
  s.spinTick = 0
  s.wavePosition = 0
  s.waveSpeed = Math.floor(bellrand(3)) + 1
  s.waveTick = 0
  s.glyphs = Array.from({ length: GRID_SIZE }, () => {
    if (!Math.floor(Math.random() * 7)) return 0
    const g = randomGlyph()
    return Math.floor(Math.random() * 20) ? g : -g
  })
}

const tickStrip = (s) => {
  s.z += s.dz
  if (s.z > GRID_DEPTH * SPLASH_RATIO) return resetStrip(s)
  s.spinnerY += s.spinnerSpeed
  if (s.spinnerY >= GRID_SIZE) {
    if (s.erasing) return resetStrip(s)
    //erase it slower than it was drawn
    s.erasing = true
    s.spinnerY = 0
    s.spinnerSpeed /= 2
  }
  if (++s.spinTick > s.spinSpeed) {
    s.spinTick = 0
    s.spinnerGlyph = -randomGlyph()
    s.glyphs.forEach((g, i) => {
      if (g >= 0) return
      //now and then a changing glyph settles
      s.glyphs[i] = Math.floor(Math.random() * 800) ? -randomGlyph() : randomGlyph()
    })
  }
  if (++s.waveTick > s.waveSpeed) {
    s.waveTick = 0
    s.wavePosition = (s.wavePosition + 1) % WAVE_SIZE
  }
}

//mirrored glyphs pre-drawn with a glow, one row plain and one row bright for changing glyphs
const buildAtlas = (cell) => {
  const atlas = document.createElement('canvas')
  atlas.width = cell * glyphs.length
  atlas.height = cell * 2
  const context = atlas.getContext('2d')
  context.font = `${Math.round(cell * 0.8)}px monospace`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.shadowBlur = cell * 0.15
  ;['#2cff6e', '#d4ffe0'].forEach((colour, row) => {
    context.fillStyle = colour
    context.shadowColor = colour
    glyphs.forEach((glyph, i) => {
      context.save()
      context.translate((i + 0.5) * cell, (row + 0.5) * cell)
      context.scale(-1, 1)
      context.fillText(glyph, 0, 0)
      context.restore()
    })
  })
  return atlas
}

//matrix code rain on a canvas behind the game, only running while that theme is on
export const startRain = () => {
  const root = document.documentElement
  const canvas = document.createElement('canvas')
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:none'
  document.body.prepend(canvas)
  const context = canvas.getContext('2d')
  const cell = 64
  const atlas = buildAtlas(cell)

  //start every strip part way through so the screen is already full of rain
  const strips = Array.from({ length: STRIPS }, () => {
    const s = {}
    resetStrip(s)
    s.erasing = Math.random() < 0.5
    s.spinnerY = frand(GRID_SIZE)
    return s
  })

  const camera = { last: 0, target: 0, x: 0, y: 0, steps: 100, tick: 0, moving: false, wait: 0 }
  const trackCamera = () => {
    if (!camera.moving) {
      if (++camera.wait < 20) return
      camera.wait = 0
      if (Math.floor(Math.random() * 20)) return
      camera.moving = true
    }
    const [ox, oy] = views[camera.last]
    const [tx, ty] = views[camera.target]
    //ease between views so the camera never jerks to a stop
    const t = Math.sin(((Math.PI / 2) * camera.tick) / camera.steps)
    camera.x = ox + (tx - ox) * t
    camera.y = oy + (ty - oy) * t
    if (++camera.tick >= camera.steps) {
      camera.tick = 0
      camera.steps = 350
      camera.last = camera.target
      camera.target = Math.floor(Math.random() * (views.length - 1)) + 1
      camera.moving = false
    }
  }

  let width = 0
  let height = 0
  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
    width = canvas.width = Math.round(innerWidth * ratio)
    height = canvas.height = Math.round(innerHeight * ratio)
  }

  const draw = () => {
    context.globalCompositeOperation = 'source-over'
    context.globalAlpha = 1
    context.fillStyle = '#000'
    context.fillRect(0, 0, width, height)
    //overlapping glyphs add up and glow brighter
    context.globalCompositeOperation = 'lighter'

    //same view as an 80 degree perspective with the eye at z 25
    const focal = height / 2 / Math.tan((40 * Math.PI) / 180)
    const ax = (camera.x * Math.PI) / 180
    const ay = (camera.y * Math.PI) / 180
    const sinX = Math.sin(ax)
    const cosX = Math.cos(ax)
    const sinY = Math.sin(ay)
    const cosY = Math.cos(ay)

    const glyph = (g, x, y, z, brightness) => {
      const changing = g < 0
      if (changing) brightness *= 1.5
      //fog dims far strips without letting any go fully black
      brightness *= 0.2 + (z / GRID_DEPTH + 0.5) * 0.8
      //fade out glyphs about to splash into the glass
      if (z > GRID_DEPTH / 2) {
        const ratio = (z - GRID_DEPTH / 2) / (GRID_DEPTH * SPLASH_RATIO - GRID_DEPTH / 2)
        brightness *= ramp[Math.min(WAVE_SIZE - 1, Math.max(0, Math.floor(ratio * WAVE_SIZE)))]
      }
      const top = y + 1
      const rx = x * cosY + z * sinY
      const rz = -x * sinY + z * cosY
      const ry = top * cosX - rz * sinX
      const depth = 25 - (top * sinX + rz * cosX)
      if (depth < 1) return
      const scale = focal / depth
      const sx = width / 2 + rx * scale
      const sy = height / 2 - ry * scale
      if (scale < 2 || sx > width || sy > height || sx + scale < 0 || sy + scale < 0) return
      context.globalAlpha = Math.min(1, brightness)
      const index = Math.abs(g) - 1
      context.drawImage(atlas, index * cell, changing ? cell : 0, cell, cell, sx, sy, scale, scale)
    }

    for (const s of strips) {
      s.glyphs.forEach((g, i) => {
        //only glyphs the feeder has passed are visible, or not yet erased
        const passed = s.erasing ? s.spinnerY < i : s.spinnerY >= i
        if (!g || !passed) return
        const wave = WAVE_SIZE - ((i + (GRID_SIZE - s.wavePosition)) % WAVE_SIZE)
        glyph(g, s.x, s.y - i, s.z, ramp[Math.min(wave, WAVE_SIZE - 1)])
      })
      if (!s.erasing) glyph(s.spinnerGlyph, s.x, s.y - s.spinnerY, s.z, 1)
    }
  }

  let frame = null
  let last = 0
  const loop = (now) => {
    frame = requestAnimationFrame(loop)
    if (now - last < TICK) return
    //catch up after a slow frame, but never by more than a few steps
    const ticks = Math.min(3, Math.floor((now - last) / TICK))
    last = now
    for (let n = 0; n < ticks; n++) {
      strips.forEach(tickStrip)
      trackCamera()
    }
    draw()
  }

  const update = () => {
    const on = root.dataset.theme === 'matrix'
    canvas.style.display = on ? 'block' : 'none'
    if (on && !frame) {
      resize()
      last = performance.now()
      frame = requestAnimationFrame(loop)
    } else if (!on && frame) {
      cancelAnimationFrame(frame)
      frame = null
    }
  }

  new MutationObserver(update).observe(root, { attributes: true, attributeFilter: ['data-theme'] })
  window.addEventListener('resize', () => frame && resize())
  update()
}
