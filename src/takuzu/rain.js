import { BRIGHT, GLYPH, glyphImage } from '../shell/backgrounds/matrix'

//two glyphs from the matrix rain for 0 and 1, drawn the way the rain draws them
export const rain = ['ｼ', 'ﾓ']

//draws them once and hands them to the css, which only uses them on the matrix theme
export const showRain = (on) => {
  const root = document.documentElement
  if (!on) {
    delete root.dataset.rain
    return
  }
  if (!root.style.getPropertyValue('--tz-rain-0')) {
    const zero = glyphImage(rain[0], 192, GLYPH)
    const one = glyphImage(rain[1], 192, BRIGHT)
    if (!zero || !one) return
    root.style.setProperty('--tz-rain-0', `url(${zero})`)
    root.style.setProperty('--tz-rain-1', `url(${one})`)
  }
  root.dataset.rain = 'on'
}
