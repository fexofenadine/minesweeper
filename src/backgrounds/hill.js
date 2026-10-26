//classic's optional bliss style scene: a live sky over a hill made by hill.py
import hillUrl from './hill.webp'
import ridge from './ridge.json'

const HILL_WIDTH = 2400
const HILL_HEIGHT = 851
//bliss's ridge sits a little over halfway down the picture
const RIDGE = 0.53

//bliss's sky, top to horizon
const sky = [
  [0, '#4279ee'],
  [0.2, '#3d76ee'],
  [0.3, '#4e84f1'],
  [0.42, '#84a8f2'],
  [0.56, '#96b2f2'],
]

//value noise, enough for soft clouds
const hash = (x, y, seed) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
  return n - Math.floor(n)
}
const smooth = (t) => t * t * (3 - 2 * t)
export const noise = (x, y, seed) => {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const u = smooth(x - xi)
  const v = smooth(y - yi)
  const a = hash(xi, yi, seed)
  const b = hash(xi + 1, yi, seed)
  const c = hash(xi, yi + 1, seed)
  const d = hash(xi + 1, yi + 1, seed)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
const fbm = (x, y, seed) => {
  let sum = 0
  let amp = 0.5
  for (let octave = 0; octave < 5; octave++) {
    sum += amp * noise(x, y, seed + octave * 13)
    x *= 2.03
    y *= 2.03
    amp /= 2
  }
  return sum
}

//cumulus have flat grey bases, cirrus are thin streaks
const SPRITE_WIDTH = 384
const SPRITE_HEIGHT = 128
const makeCloud = (seed, kind) => {
  const canvas = document.createElement('canvas')
  canvas.width = SPRITE_WIDTH
  canvas.height = SPRITE_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) return null
  const image = context.createImageData(SPRITE_WIDTH, SPRITE_HEIGHT)
  for (let y = 0; y < SPRITE_HEIGHT; y++) {
    for (let x = 0; x < SPRITE_WIDTH; x++) {
      const dx = (x / SPRITE_WIDTH) * 2 - 1
      const dy = (y / SPRITE_HEIGHT) * 2 - 1
      const i = (y * SPRITE_WIDTH + x) * 4
      let alpha
      let shade
      if (kind === 'cirrus') {
        const falloff = Math.max(0, 1 - dx * dx - dy * dy * 2)
        const n = fbm((x / SPRITE_WIDTH) * 2.5, (y / SPRITE_HEIGHT) * 9, seed)
        alpha = Math.min(1, Math.max(0, (n - 0.42) * 3)) * falloff
        shade = 252
      } else {
        const falloff = Math.max(0, 1 - dx * dx - dy * dy * (dy > 0 ? 4 : 1.1))
        const n = fbm((x / SPRITE_WIDTH) * 4, (y / SPRITE_HEIGHT) * 2.6, seed)
        alpha = Math.min(1, Math.max(0, (n * falloff - 0.14) * 5))
        shade = 255 - 55 * Math.max(0, dy + 0.15) * Math.min(1, alpha * 1.5)
      }
      image.data[i] = shade - 10
      image.data[i + 1] = shade - 5
      image.data[i + 2] = shade
      image.data[i + 3] = alpha * 255
    }
  }
  context.putImageData(image, 0, 0)
  return canvas
}
const kinds = ['cumulus', 'cumulus', 'cumulus', 'cumulus', 'cirrus', 'cirrus']

//cover the screen width and bottom, ridge at bliss's height
export const hillLayout = (width, height) => {
  const scale = Math.max(width / HILL_WIDTH, (height * (1 - RIDGE)) / HILL_HEIGHT)
  const w = HILL_WIDTH * scale
  return { x: (width - w) / 2, y: height * RIDGE, w, h: HILL_HEIGHT * scale }
}

export default {
  name: 'Hill',
  credit:
    'Hill from a CC0 photo of Cattle Hill, Roedean by Hassocks5489, colour matched to Bliss, under a sky drawn live',
  wallpaper: true,
  //classic looks like the original game unless this is turned on
  animated: false,
  ratio: (pixels) => pixels,
  options: [
    {
      key: 'wind',
      label: 'Wind speed',
      type: 'range',
      min: 0.25,
      max: 4,
      step: 0.25,
      value: 1,
      format: (v) => `${v}×`,
    },
    {
      key: 'cover',
      label: 'Cloud cover',
      type: 'range',
      min: 0,
      max: 100,
      step: 5,
      value: 35,
      format: (v) => `${v}%`,
    },
    { key: 'shadows', label: 'Cloud shadows', type: 'toggle', value: true },
  ],

  create: (context, settings) => {
    let f = settings
    let width = 0
    let height = 0
    let last = 0
    const hill = new Image()
    hill.src = hillUrl
    let shape = null
    //sprites are made one per frame so starting never stalls
    const sprites = { cumulus: [], cirrus: [] }
    let made = 0
    let clouds = []

    //small cumulus low, bigger above, cirrus highest
    const layers = [
      { top: 0.38, bottom: 0.47, size: 0.35, alpha: 0.95, speed: 3, kind: 'cumulus' },
      { top: 0.15, bottom: 0.32, size: 0.7, alpha: 0.95, speed: 7, kind: 'cumulus' },
      { top: 0, bottom: 0.14, size: 1.6, alpha: 0.6, speed: 10, kind: 'cirrus' },
    ]
    //undefined until a sprite of its kind exists
    const spriteOf = (cloud) => {
      const list = sprites[cloud.layer.kind]
      return list[cloud.sprite % list.length]
    }

    const scatter = () => {
      const count = Math.round((f.cover / 100) * 18)
      clouds = Array.from({ length: count }, (_, i) => {
        const layer = layers[i % layers.length]
        return {
          layer,
          sprite: i,
          x: Math.random(),
          y: layer.top + Math.random() * (layer.bottom - layer.top),
          stretch: 0.7 + Math.random() * 0.8,
        }
      })
    }

    //the grass outline from hill.py, for keeping cloud shadows off the sky
    const outline = () => {
      const { x, y, w, h } = hillLayout(width, height)
      const path = new Path2D()
      path.moveTo(x, height)
      for (const [px, py] of ridge) path.lineTo(x + px * w, y + py * h)
      path.lineTo(x + w, height)
      path.closePath()
      return path
    }

    const cloudBox = (cloud) => {
      const base = (width / 3) * cloud.layer.size
      const w = base * cloud.stretch
      const h = (w * SPRITE_HEIGHT) / SPRITE_WIDTH
      //clouds wrap round from right to left
      const span = width + w
      const x = ((cloud.x * span) % span) - w
      return { x, y: cloud.y * height, w, h }
    }

    const draw = () => {
      const gradient = context.createLinearGradient(0, 0, 0, height * RIDGE)
      for (const [stop, colour] of sky) gradient.addColorStop(stop / sky[sky.length - 1][0], colour)
      context.globalAlpha = 1
      context.fillStyle = gradient
      context.fillRect(0, 0, width, height)

      for (const cloud of clouds) {
        const sprite = spriteOf(cloud)
        if (!sprite) continue
        const { x, y, w, h } = cloudBox(cloud)
        context.globalAlpha = cloud.layer.alpha
        context.drawImage(sprite, x, y, w, h)
      }
      context.globalAlpha = 1

      if (!hill.complete || !hill.naturalWidth) return
      const { x, y, w, h } = hillLayout(width, height)
      context.drawImage(hill, x, y, w, h)

      //the bigger clouds' shadows, stretched over the grass
      if (f.shadows && shape) {
        context.save()
        context.clip(shape)
        for (const cloud of clouds) {
          if (cloud.layer !== layers[1]) continue
          const sprite = spriteOf(cloud)
          if (!sprite) continue
          const box = cloudBox(cloud)
          context.globalAlpha = 0.18
          context.globalCompositeOperation = 'multiply'
          context.drawImage(sprite, box.x, height * 0.62 + box.y * 0.6, box.w * 1.3, box.h * 1.8)
        }
        context.restore()
      }
    }

    return {
      configure: (next) => {
        f = next
        scatter()
      },
      resize: (w, h) => {
        width = w
        height = h
        last = performance.now()
        shape = typeof Path2D === 'undefined' ? null : outline()
        if (!clouds.length) scatter()
        draw()
      },
      frame: (now) => {
        if (made < kinds.length) {
          const kind = kinds[made++]
          const sprite = makeCloud(made, kind)
          if (sprite) sprites[kind].push(sprite)
        }
        const seconds = Math.min(0.1, (now - last) / 1000)
        last = now
        //drift in screen widths per second
        for (const cloud of clouds) cloud.x += (cloud.layer.speed * f.wind * seconds) / 1000
        draw()
      },
    }
  },
}
