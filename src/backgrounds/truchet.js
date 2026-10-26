/* truchet --- curved and straight tilings
 * Copyright (c) 1998 Adrian Likins <adrian@gimp.org>
 *
 * Permission to use, copy, modify, distribute, and sell this software and its
 * documentation for any purpose is hereby granted without fee, provided that
 * the above copyright notice appear in all copies and that both that
 * copyright notice and this permission notice appear in supporting
 * documentation.  No representations are made about the suitability of this
 * software for any purpose.  It is provided "as is" without express or
 * implied warranty.
 */

//canvas port of truchet.c, redrawing tiles at the scroll offset instead of a big pixmap

const MAXRATIO = 2

//solarized accents in place of the original's random rgb colours
const palettes = {
  accents: ['#b58900', '#cb4b16', '#dc322f', '#d33682', '#6c71c4', '#268bd2', '#2aa198', '#859900'],
  cool: ['#6c71c4', '#268bd2', '#2aa198', '#859900'],
  warm: ['#b58900', '#cb4b16', '#dc322f', '#d33682'],
  base: ['#586e75', '#657b83', '#839496', '#93a1a1'],
}
const BACKGROUND = '#002b36'

const random = (n) => Math.floor(Math.random() * n)

//XDrawArc angles are 64ths of a degree, counterclockwise
const xarc = (context, x, y, w, h, a1, a2) => {
  const rad = Math.PI / (180 * 64)
  context.moveTo(x + w / 2 + (w / 2) * Math.cos(a1 * rad), y + h / 2 - (h / 2) * Math.sin(a1 * rad))
  context.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, -a1 * rad, -(a1 + a2) * rad, a2 > 0)
}

const line = (context, x1, y1, x2, y2) => {
  context.moveTo(x1, y1)
  context.lineTo(x2, y2)
}

//draw_truchet: two quarter circles per tile, joining edge midpoints
const curve = (context, x, y, w, h, flip) => {
  if (!flip) {
    xarc(context, x - w / 2, y - h / 2, w, h, 0, -5760)
    xarc(context, x + w / 2, y + h / 2, w, h, 11520, -5760)
  } else {
    xarc(context, x + w / 2, y - h / 2, w, h, 17280, -5760)
    xarc(context, x - w / 2, y + h / 2, w, h, 0, 5760)
  }
}

//draw_angles: the same joins as straight lines
const angle = (context, x, y, w, h, flip) => {
  if (!flip) {
    line(context, x + w / 2, y, x + w, y + h / 2)
    line(context, x, y + h / 2, x + w / 2, y + h)
  } else {
    line(context, x + w / 2, y, x, y + h / 2)
    line(context, x + w, y + h / 2, x + w / 2, y + h)
  }
}

export default {
  name: 'Truchet',
  credit: 'Ported from Truchet by Adrian Likins, part of xscreensaver',
  wallpaper: true,
  ratio: (pixels) => pixels,
  //xscreensaver's options with calmer defaults
  options: [
    {
      key: 'minWidth',
      label: 'Smallest tile',
      type: 'range',
      min: 12,
      max: 256,
      step: 4,
      value: 40,
    },
    {
      key: 'maxWidth',
      label: 'Largest tile',
      type: 'range',
      min: 12,
      max: 512,
      step: 4,
      value: 150,
    },
    {
      key: 'minLineWidth',
      label: 'Thinnest line',
      type: 'range',
      min: 1,
      max: 48,
      step: 1,
      value: 2,
    },
    {
      key: 'maxLineWidth',
      label: 'Thickest line',
      type: 'range',
      min: 2,
      max: 96,
      step: 1,
      value: 25,
    },
    { key: 'curves', label: 'Curves', type: 'toggle', value: true },
    { key: 'angles', label: 'Angles', type: 'toggle', value: true },
    { key: 'square', label: 'Square tiles', type: 'toggle', value: true },
    { key: 'erase', label: 'Erase each pattern', type: 'toggle', value: true },
    {
      key: 'eraseCount',
      label: 'Layers before erasing',
      type: 'range',
      min: 2,
      max: 50,
      step: 1,
      value: 25,
    },
    { key: 'scroll', label: 'Scroll', type: 'toggle', value: true },
    {
      key: 'delay',
      label: 'Pattern delay',
      type: 'range',
      min: 0.2,
      max: 20,
      step: 0.2,
      value: 6,
      format: (v) => `${v} s`,
    },
    {
      key: 'animDelay',
      label: 'Scroll step delay',
      type: 'range',
      min: 10,
      max: 200,
      step: 5,
      value: 30,
      format: (v) => `${v} ms`,
    },
    {
      key: 'animStep',
      label: 'Scroll step size',
      type: 'range',
      min: 1,
      max: 9,
      step: 1,
      value: 1,
    },
    {
      key: 'palette',
      label: 'Colours',
      type: 'select',
      choices: [
        ['accents', 'All accents'],
        ['cool', 'Violet to green'],
        ['warm', 'Yellow to magenta'],
        ['base', 'Base tones'],
      ],
      value: 'accents',
    },
    {
      key: 'opacity',
      label: 'Line strength',
      type: 'range',
      min: 10,
      max: 100,
      step: 5,
      value: 45,
      format: (v) => `${v}%`,
    },
  ],

  create: (context, settings) => {
    let f = settings
    let width = 0
    let height = 0
    let pixels = 1
    //scroll-overlap, the extra pattern the scroll pans over
    let overlap = 0
    let layers = []
    let count = 0
    let scrolling = 0
    let last = 0
    let wait = 0

    //truchet_draw: a new layer of random tiles
    const pattern = () => {
      let linewidth = random(f.maxLineWidth)
      if (linewidth < f.minLineWidth) linewidth = f.minLineWidth
      //try to get an odd linewidth as it seems to work a little better
      if (linewidth % 2) linewidth++
      let w = random(f.maxWidth)
      let h = random(f.maxWidth)
      if (w === 0 || h === 0) w = h = f.maxWidth
      if (h < f.minWidth) h = f.minWidth
      if (w < f.minWidth) w = f.minWidth
      if (f.square) h = w
      if (Math.floor(w / h) > MAXRATIO) h = w
      if (Math.floor(h / w) > MAXRATIO) w = h
      if (linewidth >= h / 5) linewidth = Math.floor(h / 5)
      linewidth = Math.max(1, linewidth)

      if (f.erase || count >= f.eraseCount) {
        layers = []
        count = 0
      }
      overlap = f.scroll ? 400 * pixels : 0
      //both on picks at random, neither falls back to curves
      const kind = f.angles && (!f.curves || random(2)) ? 'angle' : 'curve'
      const colours = palettes[f.palette]
      const cols = Math.ceil((width + overlap) / (w * pixels)) + 1
      const rows = Math.ceil((height + overlap) / (h * pixels)) + 1
      layers.push({
        kind,
        w: w * pixels,
        h: h * pixels,
        linewidth: linewidth * pixels,
        colour: colours[random(colours.length)],
        cols,
        tiles: Uint8Array.from({ length: cols * rows }, () => random(2)),
      })
      count++
      if (f.scroll) scrolling = Math.floor(overlap / pixels / 4 / f.animStep) * 4
    }

    //the visible window into the pattern for this scroll step, see scroll_area
    const offsetOf = () => {
      if (!f.scroll) return [0, 0]
      const offset = overlap / 2
      const scroll = overlap / pixels / 4
      const legs = Math.max(1, Math.floor(scroll / f.animStep))
      const direction = Math.floor(scrolling / legs)
      const progress = (scrolling % legs) * f.animStep
      let x = direction & 1 ? progress - scroll : -progress
      let y = direction & 1 ? progress : progress - scroll
      if (direction & 2) {
        x = -x
        y = -y
      }
      return [x * pixels + offset, y * pixels + offset]
    }

    const draw = () => {
      const [ox, oy] = offsetOf()
      context.globalAlpha = 1
      context.fillStyle = BACKGROUND
      context.fillRect(0, 0, width, height)
      context.globalAlpha = f.opacity / 100
      context.lineCap = 'round'
      context.lineJoin = 'round'
      for (const layer of layers) {
        const { w, h, cols, tiles } = layer
        const tile = layer.kind === 'curve' ? curve : angle
        context.strokeStyle = layer.colour
        context.lineWidth = layer.linewidth
        context.beginPath()
        //only the tiles that show at this offset
        const x0 = Math.max(0, Math.floor(ox / w) - 1)
        const y0 = Math.max(0, Math.floor(oy / h) - 1)
        const x1 = Math.min(cols, Math.ceil((ox + width) / w) + 1)
        const y1 = Math.min(tiles.length / cols, Math.ceil((oy + height) / h) + 1)
        for (let cy = y0; cy < y1; cy++) {
          for (let cx = x0; cx < x1; cx++) {
            tile(context, cx * w - ox, cy * h - oy, w, h, tiles[cy * cols + cx])
          }
        }
        context.stroke()
      }
      context.globalAlpha = 1
    }

    const restart = () => {
      layers = []
      count = 0
      scrolling = 0
      pattern()
      wait = f.scroll ? f.animDelay : f.delay * 1000
      draw()
    }

    return {
      configure: (next) => {
        f = next
        if (width) restart()
      },
      resize: (w, h, scale = 1) => {
        width = w
        height = h
        pixels = scale
        last = performance.now()
        restart()
      },
      frame: (now) => {
        if (now - last < wait) return
        last = now
        //while scrolling, step the pan, otherwise lay down the next pattern
        if (scrolling) {
          scrolling--
          wait = f.animDelay
        } else {
          pattern()
          wait = f.scroll ? f.animDelay : f.delay * 1000
        }
        draw()
      },
      //one pattern, centred, and done
      still: () => {
        scrolling = 0
        draw()
        return true
      },
    }
  },
}
