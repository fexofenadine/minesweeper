//turns the 13px bitmap strike of wine's ms_sans_serif.sfd into pixel-square truetype fonts
//source: github.com/wine-mirror/wine/blob/9ecca23a32a14976641e44e88f79ffa81050f4f9/fonts/ms_sans_serif.sfd
//usage: npm i --no-save opentype.js@1 && node src/fonts/convert.mjs src/fonts/ms_sans_serif.sfd <out dir>
//then compress the .ttf files to .woff2, e.g. with npx wawoff2 or woff2_compress
import fs from 'node:fs'
import opentype from 'opentype.js'

const [, , sfdPath, outDir] = process.argv
const sfd = fs.readFileSync(sfdPath, 'latin1')
const lines = sfd.split(/\r?\n/)

const strikeStart = lines.findIndex((l) => l.startsWith('BitmapFont: 13 '))
const [, , , ascent, descent] = lines[strikeStart].split(' ').map(Number)

//adobe ascii85 with z for four zero bytes
const ascii85 = (text) => {
  const out = []
  let group = []
  for (const ch of text.replace(/\s/g, '')) {
    if (ch === 'z' && group.length === 0) {
      out.push(0, 0, 0, 0)
      continue
    }
    group.push(ch.charCodeAt(0) - 33)
    if (group.length === 5) {
      let n = 0
      for (const d of group) n = n * 85 + d
      out.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255)
      group = []
    }
  }
  if (group.length) {
    const len = group.length
    while (group.length < 5) group.push(84)
    let n = 0
    for (const d of group) n = n * 85 + d
    const bytes = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
    out.push(...bytes.slice(0, len - 1))
  }
  return out
}

const chars = []
for (let i = strikeStart + 1; i < lines.length; i++) {
  const line = lines[i]
  if (line.startsWith('BitmapFont:') || line.startsWith('EndBitmapFont')) break
  if (!line.startsWith('BDFChar:')) continue
  const [, unicode, width, xmin, xmax, ymin, ymax] = line.slice(9).trim().split(/\s+/).map(Number)
  let data = ''
  while (
    i + 1 < lines.length &&
    !lines[i + 1].startsWith('BDFChar:') &&
    !lines[i + 1].startsWith('EndBitmapFont') &&
    !lines[i + 1].startsWith('BitmapFont:')
  )
    data += lines[++i]
  const bytes = ascii85(data)
  const cols = xmax - xmin + 1
  const rows = ymax - ymin + 1
  const stride = Math.ceil(cols / 8)
  const pixels = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const byte = bytes[r * stride + (c >> 3)] ?? 0
      if (byte & (0x80 >> (c & 7))) pixels.push([xmin + c, ymax - r])
    }
  }
  //latin-1 plus common typographic punctuation keeps the files small
  const keep =
    (unicode >= 0x20 && unicode <= 0x7e) ||
    (unicode >= 0xa0 && unicode <= 0xff) ||
    [0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2026, 0x20ac, 0x2122].includes(
      unicode,
    )
  if (keep) chars.push({ unicode, width, pixels })
}

const P = 128
const build = (bold) => {
  const glyphs = [
    new opentype.Glyph({ name: '.notdef', advanceWidth: 5 * P, path: new opentype.Path() }),
  ]
  for (const { unicode, width, pixels } of chars) {
    const lit = new Set(pixels.map(([x, y]) => `${x},${y}`))
    //windows emboldens bitmap fonts by smearing each pixel one to the right
    if (bold) for (const [x, y] of pixels) lit.add(`${x + 1},${y}`)
    const byRow = new Map()
    for (const key of lit) {
      const [x, y] = key.split(',').map(Number)
      if (!byRow.has(y)) byRow.set(y, [])
      byRow.get(y).push(x)
    }
    const path = new opentype.Path()
    for (const [y, xs] of byRow) {
      xs.sort((a, b) => a - b)
      let start = xs[0]
      let prev = xs[0]
      const flush = (from, to) => {
        //clockwise rectangle for one run of lit pixels
        path.moveTo(from * P, y * P)
        path.lineTo(from * P, (y + 1) * P)
        path.lineTo((to + 1) * P, (y + 1) * P)
        path.lineTo((to + 1) * P, y * P)
        path.close()
      }
      for (const x of xs.slice(1)) {
        if (x === prev + 1) prev = x
        else {
          flush(start, prev)
          start = prev = x
        }
      }
      flush(start, prev)
    }
    glyphs.push(
      new opentype.Glyph({
        name: `u${unicode.toString(16).padStart(4, '0')}`,
        unicode,
        advanceWidth: (width + (bold ? 1 : 0)) * P,
        path,
      }),
    )
  }
  const font = new opentype.Font({
    familyName: 'Wine MS Sans Serif Pixel',
    styleName: bold ? 'Bold' : 'Regular',
    unitsPerEm: 11 * P,
    ascender: ascent * P,
    descender: -descent * P,
    glyphs,
  })
  font.tables.os2 = { ...font.tables.os2, usWeightClass: bold ? 700 : 400 }
  const file = `${outDir}/ms_sans_serif${bold ? '_bold' : ''}.ttf`
  fs.writeFileSync(file, Buffer.from(font.toArrayBuffer()))
  console.log(`${file}: ${glyphs.length} glyphs`)
}

console.log(`strike 13px, ascent ${ascent}, descent ${descent}, ${chars.length} chars`)
build(false)
build(true)
