/* xscreensaver, Copyright (c) 1999-2025 Jamie Zawinski <jwz@jwz.org>
 *
 * Permission to use, copy, modify, distribute, and sell this software and its
 * documentation for any purpose is hereby granted without fee, provided that
 * the above copyright notice appear in all copies and that both that
 * copyright notice and this permission notice appear in supporting
 * documentation.  No representations are made about the suitability of this
 * software for any purpose.  It is provided "as is" without express or
 * implied warranty.
 *
 * Phosphor -- simulate a glass tty with long-sustain phosphor.
 * Written by Jamie Zawinski <jwz@jwz.org>
 */

//canvas port of phosphor.c, typing this game's own source

import { FONT_HEIGHT, FONT_WIDTH, pixel } from './font6x10'

const BLANK = 0
const FLARE = 1
const NORMAL = 2
const FADE = 3
const STATE_MAX = FADE

const CHAR_WIDTH = FONT_WIDTH - 1
const CHAR_HEIGHT = FONT_HEIGHT

const BACKGROUND = '#002b36'
//base3, the flare for a foreground brighter than the background
const WHITE = '#fdf6e3'
const colours = {
  base1: '#93a1a1',
  cyan: '#2aa198',
  green: '#859900',
  yellow: '#b58900',
  blue: '#268bd2',
  violet: '#6c71c4',
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const css = ([r, g, b]) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`
const brightness = ([r, g, b]) => Math.max(r, g, b)

//the source files, loaded only once phosphor first runs
const sources = import.meta.glob(
  ['/src/**/*.{js,jsx}', '!/src/**/*.test.*', '!/src/shell/backgrounds/font6x10.js'],
  {
    query: '?raw',
    import: 'default',
  },
)

let texts = null
export const loadTexts = () =>
  (texts ??= Promise.all(
    Object.entries(sources).map(async ([path, load]) => ({
      name: path.slice(1),
      text: await load(),
    })),
  ))

//a glyph's lit runs as [row, from, to], see capture_font_bits
const runCache = new Map()
const runsOf = (c, inverted) => {
  const key = c * 2 + (inverted ? 1 : 0)
  if (runCache.has(key)) return runCache.get(key)
  const runs = []
  for (let y = 0; y < FONT_HEIGHT; y++) {
    for (let x1 = 0; x1 < FONT_WIDTH; x1++) {
      if (!(pixel(c, x1, y) ^ inverted)) continue
      let x2 = x1
      while (x2 + 1 < FONT_WIDTH && pixel(c, x2 + 1, y) ^ inverted) x2++
      runs.push([y, x1, x2])
      x1 = x2
    }
  }
  runCache.set(key, runs)
  return runs
}

export default {
  name: 'Phosphor',
  credit: 'Ported from Phosphor by Jamie Zawinski, part of xscreensaver',
  wallpaper: true,
  ratio: (pixels) => pixels,
  options: [
    { key: 'scale', label: 'Scale', type: 'range', min: 2, max: 12, step: 1, value: 6 },
    { key: 'ticks', label: 'Fade', type: 'range', min: 4, max: 40, step: 1, value: 20 },
    {
      key: 'delay',
      label: 'Typing delay',
      type: 'range',
      min: 10,
      max: 200,
      step: 5,
      value: 50,
      format: (v) => `${v} ms`,
    },
    {
      key: 'cursor',
      label: 'Cursor blink',
      type: 'range',
      min: 100,
      max: 1000,
      step: 1,
      value: 333,
      format: (v) => `${v} ms`,
    },
    {
      key: 'colour',
      label: 'Colour',
      type: 'select',
      choices: [
        ['cyan', 'Cyan'],
        ['base1', 'Grey'],
        ['green', 'Green'],
        ['yellow', 'Yellow'],
        ['blue', 'Blue'],
        ['violet', 'Violet'],
      ],
      value: 'cyan',
    },
    //not in the original, keeps the text behind the game
    {
      key: 'brightness',
      label: 'Brightness',
      type: 'range',
      min: 10,
      max: 100,
      step: 5,
      value: 55,
      format: (v) => `${v}%`,
    },
  ],

  create: (context, settings) => {
    let f = settings
    let width = 0
    let height = 0
    let pixels = 1
    let scale = 6
    let gridWidth = 0
    let gridHeight = 0
    let ticks = 0
    let gcs = []
    //what each cell shows, and the tty text is printed into
    let chars = new Uint8Array(0)
    let states = new Uint8Array(0)
    let changed = new Uint8Array(0)
    let tty = new Uint8Array(0)
    let x = 0
    let y = 0
    let cursorX = 0
    let cursorY = 0
    let cursorOn = true
    let cursorAt = 0
    let queue = '$ '
    let last = 0

    //phosphor's gcs: a ramp from foreground to background
    const colour = () => {
      const bg = rgb(BACKGROUND)
      const dim = (hex) => rgb(hex).map((ch, i) => bg[i] + ((ch - bg[i]) * f.brightness) / 100)
      const fg = dim(colours[f.colour])
      ticks = STATE_MAX + f.ticks
      const ncolors = Math.max(1, ticks - 3)
      //scale_color_channel: start the fade well below the foreground
      const start = fg.map((ch, i) => (ch * 100 + bg[i] * 156) / 256)
      const ramp = Array.from({ length: ncolors }, (_, i) =>
        css(start.map((ch, j) => ch + ((bg[j] - ch) * i) / ncolors)),
      )
      ticks = ncolors + STATE_MAX
      gcs = [BACKGROUND, css(brightness(bg) <= brightness(fg) ? dim(WHITE) : fg), css(fg), ...ramp]
    }

    const drawCell = (cx, cy) => {
      const i = cy * gridWidth + cx
      let st = states[i]
      let c = chars[i]
      let inverted = false
      const cursor = cx === cursorX && cy === cursorY
      if (cursor) {
        if (cursorOn) inverted = true
        if (st >= FADE) c = 32
        if (st === BLANK || st >= FADE) st = NORMAL
      }
      const w = CHAR_WIDTH * scale
      const h = CHAR_HEIGHT * scale
      const tx = cx * w
      const ty = cy * h
      context.fillStyle = BACKGROUND
      context.fillRect(tx, ty, w, h)
      const runs = runsOf(c, inverted)
      if (!runs.length || (states[i] === BLANK && !cursor)) return

      //a wide dim stroke, then a narrow one in this state's colour
      const strokeRuns = (lineWidth, style) => {
        //round caps like the original, which also turn single pixel runs into dots
        context.lineCap = 'round'
        context.lineWidth = lineWidth
        context.strokeStyle = style
        context.beginPath()
        for (const [row, x1, x2] of runs) {
          context.moveTo(tx + x1 * scale + scale / 2, ty + row * scale)
          context.lineTo(tx + x2 * scale + scale / 2, ty + row * scale)
        }
        context.stroke()
      }
      context.save()
      context.beginPath()
      context.rect(tx, ty, w, h)
      context.clip()
      const outer = Math.round(scale * 1.3) === scale ? scale + 1 : Math.round(scale * 1.3)
      const dim = st + 2 < ticks ? gcs[st + 2] : null
      strokeRuns(outer, dim || gcs[st])
      if (dim) strokeRuns(Math.max(1, Math.min(scale - 1, Math.round(scale * 0.8))), gcs[st])
      context.restore()
    }

    const update = () => {
      for (let i = 0; i < changed.length; i++) {
        if (!changed[i]) continue
        drawCell(i % gridWidth, Math.floor(i / gridWidth))
        changed[i] = 0
      }
    }

    const decay = () => {
      for (let i = 0; i < states.length; i++) {
        if (states[i] === FLARE) {
          states[i] = NORMAL
          changed[i] = 1
        } else if (states[i] >= FADE) {
          states[i]++
          if (states[i] >= ticks) {
            states[i] = BLANK
            chars[i] = 32
          }
          changed[i] = 1
        }
      }
    }

    //a tiny tty: newlines, tabs, wrapping and scrolling
    const newline = () => {
      x = 0
      if (++y < gridHeight) return
      y = gridHeight - 1
      tty.copyWithin(0, gridWidth)
      tty.fill(32, (gridHeight - 1) * gridWidth)
    }

    const ttyPrint = (code) => {
      if (code === 10) return newline()
      if (code === 13) return (x = 0)
      if (code === 9) {
        do ttyPrint(32)
        while (x % 8 && x < gridWidth)
        return
      }
      if (code < 32) return
      if (x >= gridWidth) newline()
      tty[y * gridWidth + x++] = code > 255 ? 63 : code
    }

    //print_char: show new characters, fade out old ones
    const printChar = (code) => {
      ttyPrint(code)
      for (let i = 0; i < tty.length; i++) {
        const blank = !runsOf(chars[i], false).length
        if (!blank && tty[i] === 32) {
          if (states[i] === FLARE || states[i] === NORMAL) states[i] = FADE
          changed[i] = 1
        } else if (chars[i] !== tty[i] || states[i] >= FADE) {
          states[i] = NORMAL
          changed[i] = 1
          chars[i] = tty[i]
        }
      }
      const cx = Math.min(x, gridWidth - 1)
      if (cursorX !== cx || cursorY !== y) {
        changed[cursorY * gridWidth + cursorX] = 1
        const next = y * gridWidth + cx
        if (states[next] >= FADE) chars[next] = 32
        states[next] = FLARE
        changed[next] = 1
        cursorX = cx
        cursorY = y
        cursorOn = true
        cursorAt = performance.now() + 2 * f.cursor
      }
    }

    //the next file to type, run like a shell session
    const refill = () => {
      loadTexts().then((files) => {
        if (queue.length > 2) return
        const { name, text } = files[Math.floor(Math.random() * files.length)]
        queue += `cat ${name}\n${text.replace(/\r\n/g, '\n')}\n$ `
      })
    }

    const build = () => {
      scale = f.scale * pixels
      gridWidth = Math.max(1, Math.floor(width / (CHAR_WIDTH * scale)))
      gridHeight = Math.max(1, Math.floor(height / (CHAR_HEIGHT * scale)))
      const size = gridWidth * gridHeight
      chars = new Uint8Array(size).fill(32)
      states = new Uint8Array(size)
      changed = new Uint8Array(size)
      tty = new Uint8Array(size).fill(32)
      x = y = cursorX = cursorY = 0
      colour()
      context.globalAlpha = 1
      context.fillStyle = BACKGROUND
      context.fillRect(0, 0, width, height)
      changed[0] = 1
    }

    return {
      configure: (next) => {
        f = next
        if (width) build()
      },
      resize: (w, h, scale = 1) => {
        width = w
        height = h
        pixels = scale
        last = performance.now()
        build()
      },
      frame: (now) => {
        if (now >= cursorAt) {
          cursorOn = !cursorOn
          cursorAt = now + (cursorOn ? 2 : 1) * f.cursor
          changed[cursorY * gridWidth + cursorX] = 1
        }
        //phosphor_draw: show what changed, fade, then type the next character
        const due = Math.min(8, Math.floor((now - last) / f.delay))
        for (let n = 0; n < due; n++) {
          update()
          decay()
          if (queue.length < 2) refill()
          if (queue) {
            printChar(queue.charCodeAt(0))
            queue = queue.slice(1)
          }
        }
        if (due) last = now - ((now - last) % f.delay)
        update()
      },
    }
  },
}
