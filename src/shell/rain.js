import { BRIGHT, GLYPH, glyphImage } from './backgrounds/matrix'

//two glyphs from the matrix rain, a dim one and a bright one, drawn the way the rain draws them
export const rain = ['ｼ', 'ﾓ']

//draws them once and hands them to the css as --rain-0 and --rain-1, only used on the matrix theme
export const showRain = (on) => {
  const root = document.documentElement
  if (!on) {
    delete root.dataset.rain
    return
  }
  if (!root.style.getPropertyValue('--rain-0')) {
    const dim = glyphImage(rain[0], 192, GLYPH)
    const bright = glyphImage(rain[1], 192, BRIGHT)
    if (!dim || !bright) return
    root.style.setProperty('--rain-0', `url(${dim})`)
    root.style.setProperty('--rain-1', `url(${bright})`)
  }
  root.dataset.rain = 'on'
}
