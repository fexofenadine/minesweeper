import { load, save } from './storage'

const root = document.documentElement

//zoom levels the title bar buttons step through
export const steps = [0.5, 0.625, 0.75, 0.875, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4]

//below this the cells are under 10px and the numbers get hard to read,
//so shrinking to fit stops there and the page scrolls instead
export const MIN_FIT = 0.625

export const loadZoom = () => {
  const scale = parseFloat(load('scale'))
  return Number.isFinite(scale) ? Math.min(4, Math.max(0.5, scale)) : 1
}

export const stepZoom = (scale, direction) =>
  direction > 0
    ? (steps.find((step) => step > scale + 0.001) ?? steps[steps.length - 1])
    : (steps.findLast((step) => step < scale - 0.001) ?? steps[0])

//the chosen zoom, unless the window would not fit, but never below readable
//fits are rounded down to 0.02 so tiny measuring differences cannot make it flicker
export const fitZoom = (chosen, fit) =>
  fit >= chosen ? chosen : Math.min(chosen, Math.max(MIN_FIT, Math.floor(fit * 50) / 50))

export const applyZoom = (scale) => root.style.setProperty('--scale', scale)

export const saveZoom = (scale) => save('scale', scale)

let gameWindow = null

//largest zoom at which the game window fits the browser window, measured at the current zoom
//size is the window's unzoomed size and the room for it, see sameSize
export const measureFit = (scale) => {
  const rect = gameWindow && gameWindow.getBoundingClientRect()
  if (!rect || !rect.width || !rect.height) return { fit: Infinity, size: null }
  //the margin around the window sits outside the zoom, see Dialog.module.css
  //inner sizes ignore scrollbars, which come and go as the window outgrows the page
  const frame = getComputedStyle(gameWindow.parentElement.parentElement)
  const width = innerWidth - parseFloat(frame.marginLeft) - parseFloat(frame.marginRight)
  const height = innerHeight - parseFloat(frame.marginTop) - parseFloat(frame.marginBottom)
  const size = {
    width: rect.width / scale,
    height: rect.height / scale,
    room: `${width}x${height}`,
  }
  //borders and text do not scale exactly, so leave 1% to spare
  return { fit: Math.min(width / size.width, height / size.height) * 0.99, size }
}

//the unzoomed size drifts about 1% between zoom levels, so only a bigger change counts as new,
//which tells the zoom's own changes apart from a new level, theme or browser size
export const sameSize = (a, b) =>
  Boolean(a && b) &&
  a.room === b.room &&
  Math.abs(a.width / b.width - 1) < 0.03 &&
  Math.abs(a.height / b.height - 1) < 0.03

//refit whenever the window changes size (level, theme, fonts) or the browser does
export const watchWindow = (dialog, refit) => {
  gameWindow = dialog
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => refit()).observe(dialog)
  window.addEventListener('resize', () => refit())
}
