/*
 *  Substrate (dragorn@kismetwireless.net)
 *  Directly ported code from complexification.net Substrate art
 *  http://complexification.net/gallery/machines/substrate/applet_s/substrate_s.pde
 *
 *  Substrate code:
 *  j.tarbell   June, 2004
 *  Albuquerque, New Mexico
 *  complexification.net
 *
 * Directly based the hacks of:
 *
 * xscreensaver, Copyright (c) 1997, 1998, 2002 Jamie Zawinski <jwz@jwz.org>
 *
 * Permission to use, copy, modify, distribute, and sell this software and its
 * documentation for any purpose is hereby granted without fee, provided that
 * the above copyright notice appear in all copies and that both that
 * copyright notice and this permission notice appear in supporting
 * documentation.  No representations are made about the suitability of this
 * software for any purpose.  It is provided "as is" without express or
 * implied warranty.
 */

//canvas port of xscreensaver's substrate.c, function for function
//canvas source-over with globalAlpha is the same blend as trans_point, so no offscreen copy is kept

const STEP = 0.42
//crack grid value for an empty pixel, anything below 10000 is a crack angle
const EMPTY = 10001

//nord frost and aurora in place of the original pollock colour map
const palettes = {
  nord: [
    '#8fbcbb',
    '#88c0d0',
    '#81a1c1',
    '#5e81ac',
    '#bf616a',
    '#d08770',
    '#ebcb8b',
    '#a3be8c',
    '#b48ead',
  ],
  frost: ['#8fbcbb', '#88c0d0', '#81a1c1', '#5e81ac'],
  aurora: ['#bf616a', '#d08770', '#ebcb8b', '#a3be8c', '#b48ead'],
}
const BACKGROUND = '#2e3440'
const FOREGROUND = '#d8dee9'

const frand = (n) => Math.random() * n
const random = (n) => Math.floor(Math.random() * n)
const radians = (degrees) => (degrees * Math.PI) / 180

export default {
  name: 'Substrate',
  credit: 'Ported from Substrate by J. Tarbell and Mike Kershaw, part of xscreensaver',
  ratio: () => 1,
  options: [
    {
      key: 'growthDelay',
      label: 'Growth delay',
      type: 'range',
      min: 0,
      max: 50,
      step: 1,
      value: 18,
      format: (v) => `${v} ms`,
    },
    {
      key: 'initialCracks',
      label: 'Initial cracks',
      type: 'range',
      min: 3,
      max: 20,
      step: 1,
      value: 3,
    },
    {
      key: 'maxCracks',
      label: 'Max cracks',
      type: 'range',
      min: 11,
      max: 300,
      step: 1,
      value: 100,
    },
    {
      key: 'sandGrains',
      label: 'Sand grains',
      type: 'range',
      min: 2,
      max: 256,
      step: 1,
      value: 64,
    },
    {
      key: 'circlePercent',
      label: 'Circular cracks',
      type: 'range',
      min: 0,
      max: 100,
      step: 1,
      value: 33,
      format: (v) => `${v}%`,
    },
    {
      key: 'maxCycles',
      label: 'Restart after',
      type: 'range',
      min: 0,
      max: 50000,
      step: 1000,
      value: 10000,
      format: (v) => (v ? `${v} cycles` : 'never'),
    },
    {
      key: 'palette',
      label: 'Colours',
      type: 'select',
      choices: [
        ['nord', 'Frost and aurora'],
        ['frost', 'Frost'],
        ['aurora', 'Aurora'],
      ],
      value: 'nord',
    },
    { key: 'wireframe', label: 'Wireframe', type: 'toggle', value: false },
    { key: 'seamless', label: 'Seamless', type: 'toggle', value: false },
  ],

  create: (context, settings) => {
    let f = settings
    let width = 0
    let height = 0
    let cgrid = new Int32Array(0)
    let cracks = []
    let cycles = 0
    let last = 0

    const plot = (x, y, colour, alpha) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return
      context.globalAlpha = Math.min(1, alpha)
      context.fillStyle = colour
      context.fillRect(x, y, 1, 1)
    }

    const startCrack = (cr) => {
      //synthesis of Crack::findStart() and crack::startCrack()
      let px = 0
      let py = 0
      let found = false
      let timeout = 0
      //shift until crack is found
      while (!found && timeout++ < 10000) {
        px = random(width)
        py = random(height)
        if (cgrid[py * width + px] < 10000) found = true
      }
      if (!found) {
        //timed out, use the crack's own values
        px = Math.min(width - 1, Math.max(0, Math.trunc(cr.x)))
        py = Math.min(height - 1, Math.max(0, Math.trunc(cr.y)))
        cgrid[py * width + px] = cr.t
      }
      //start a crack
      let a = cgrid[py * width + px]
      if (random(100) < 50) a -= 90 + (frand(4.1) - 2)
      else a += 90 + (frand(4.1) - 2)

      if (random(100) < f.circlePercent) {
        cr.curved = true
        cr.degreesDrawn = 0
        let r = 10 + random(Math.floor((width + height) / 2))
        if (random(100) < 50) r *= -1
        //arc length = r * theta => theta = arc length / r
        const radianInc = STEP / r
        cr.tInc = (radianInc * 360) / 2 / Math.PI
        cr.ys = r * Math.sin(radianInc)
        cr.xs = r * (1 - Math.cos(radianInc))
      } else {
        cr.curved = false
      }
      //condensed from Crack::startCrack
      cr.x = px + 0.61 * Math.cos(radians(a))
      cr.y = py + 0.61 * Math.sin(radians(a))
      cr.t = a
    }

    const makeCrack = () => {
      if (cracks.length >= f.maxCracks) return
      const colours = palettes[f.palette]
      const cr = {
        sandp: 0,
        sandg: frand(0.2) - 0.01,
        sandcolor: colours[random(colours.length)],
        curved: false,
        degreesDrawn: 0,
        x: random(width),
        y: random(height),
        t: random(360),
      }
      startCrack(cr)
      cracks.push(cr)
    }

    const regionColor = (cr) => {
      //synthesis of Crack::regionColor() and SandPainter::render()
      let rx = cr.x
      let ry = cr.y
      //seamless lines can wrap forever, so stop after a few screens
      for (let steps = (width + height) * 4; steps > 0; steps--) {
        //move perpendicular to crack
        rx += 0.81 * Math.sin(radians(cr.t))
        ry -= 0.81 * Math.cos(radians(cr.t))
        let cx = Math.trunc(rx)
        let cy = Math.trunc(ry)
        if (f.seamless) {
          cx %= width
          cy %= height
        }
        if (cx < 0 || cx >= width || cy < 0 || cy >= height) break
        if (cgrid[cy * width + cx] <= 10000) break
      }
      //modulate gain
      cr.sandg = Math.min(1, Math.max(0, cr.sandg + frand(0.1) - 0.05))
      //lay down grains of sand
      const grains = f.sandGrains
      const w = cr.sandg / (grains - 1)
      for (let i = 0; i < grains; i++) {
        const s = Math.sin(cr.sandp + Math.sin(i * w))
        let drawx = cr.x + (rx - cr.x) * s
        let drawy = cr.y + (ry - cr.y) * s
        if (f.seamless) {
          drawx = (drawx + width) % width
          drawy = (drawy + height) % height
        }
        plot(Math.trunc(drawx), Math.trunc(drawy), cr.sandcolor, 0.1 - i / (grains * 10))
      }
    }

    const restartCrack = (cr) => {
      startCrack(cr)
      makeCrack()
    }

    const moveDrawCrack = (cr) => {
      //basically Crack::move()
      if (!cr.curved) {
        cr.x += STEP * Math.cos(radians(cr.t))
        cr.y += STEP * Math.sin(radians(cr.t))
      } else {
        cr.x += cr.ys * Math.cos(radians(cr.t))
        cr.y += cr.ys * Math.sin(radians(cr.t))
        cr.x += cr.xs * Math.cos(radians(cr.t) - Math.PI / 2)
        cr.y += cr.xs * Math.sin(radians(cr.t) - Math.PI / 2)
        cr.t += cr.tInc
        cr.degreesDrawn += Math.abs(cr.tInc)
      }
      if (f.seamless) {
        cr.x = (cr.x + width) % width
        cr.y = (cr.y + height) % height
      }
      //modification of random(-0.33,0.33)
      let cx = Math.trunc(cr.x + frand(0.66) - 0.33)
      let cy = Math.trunc(cr.y + frand(0.66) - 0.33)
      if (f.seamless) {
        cx %= width
        cy %= height
      }
      if (cx < 0 || cx >= width || cy < 0 || cy >= height) {
        //out of bounds, stop cracking
        cr.x = random(width)
        cr.y = random(height)
        cr.t = random(360)
        restartCrack(cr)
        return
      }
      if (!f.wireframe) regionColor(cr)
      plot(cx, cy, FOREGROUND, 1)
      const here = cy * width + cx
      if (cr.curved && cr.degreesDrawn > 360) {
        //completed the circle, stop cracking
        restartCrack(cr)
      } else if (cgrid[here] > 10000 || Math.abs(cgrid[here] - cr.t) < 5) {
        //continue cracking
        cgrid[here] = Math.trunc(cr.t)
      } else if (Math.abs(cgrid[here] - cr.t) > 2) {
        //crack encountered (not self), stop cracking
        restartCrack(cr)
      }
    }

    //build_substrate and build_img: clear the picture and seed the first cracks
    const build = () => {
      context.globalAlpha = 1
      context.fillStyle = BACKGROUND
      context.fillRect(0, 0, width, height)
      cgrid.fill(EMPTY)
      cracks = []
      cycles = 0
      for (let n = 0; n < f.initialCracks; n++) makeCrack()
    }

    return {
      configure: (next) => {
        f = next
        if (width) build()
      },
      resize: (w, h) => {
        width = w
        height = h
        cgrid = new Int32Array(w * h)
        last = performance.now()
        build()
      },
      frame: (now) => {
        //one substrate_draw per growth delay, a few at most per frame
        const delay = Math.max(1, f.growthDelay)
        const due = Math.min(8, Math.floor((now - last) / delay))
        if (!due) return
        last = now - delay > last + due * delay ? now : last + due * delay
        for (let n = 0; n < due; n++) {
          //cracks started during this cycle also move in it, like the original
          for (let i = 0; i < cracks.length; i++) moveDrawCrack(cracks[i])
          if (++cycles >= f.maxCycles && f.maxCycles) build()
        }
      },
    }
  },
}
