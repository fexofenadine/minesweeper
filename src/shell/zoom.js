import { load, save } from './storage'

const root = document.documentElement

//zoom levels the title bar buttons step through
export const steps = [0.5, 0.625, 0.75, 0.875, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4]

//smallest readable fit, about 10px cells; below it the page scrolls
export const MIN_FIT = 0.625

export const loadZoom = () => {
  const scale = parseFloat(load('scale'))
  return Number.isFinite(scale) ? Math.min(4, Math.max(0.5, scale)) : 1
}

export const stepZoom = (scale, direction) =>
  direction > 0
    ? (steps.find((step) => step > scale + 0.001) ?? steps[steps.length - 1])
    : (steps.findLast((step) => step < scale - 0.001) ?? steps[0])

//the chosen zoom shrunk to fit, in 0.02 steps so it cannot flicker
export const fitZoom = (chosen, fit) =>
  fit >= chosen ? chosen : Math.min(chosen, Math.max(MIN_FIT, Math.floor(fit * 50) / 50))

export const applyZoom = (scale) => root.style.setProperty('--scale', scale)

export const saveZoom = (scale) => save('scale', scale)

let gameWindow = null

//the largest zoom that fits, and the window's unzoomed size and room
export const measureFit = (scale) => {
  const rect = gameWindow && gameWindow.getBoundingClientRect()
  if (!rect || !rect.width || !rect.height) return { fit: Infinity, size: null }
  //the margin is outside the zoom; inner sizes ignore scrollbars
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

//the unzoomed size drifts ~1% between zooms, so only bigger changes count
export const sameSize = (a, b) =>
  Boolean(a && b) &&
  a.room === b.room &&
  Math.abs(a.width / b.width - 1) < 0.03 &&
  Math.abs(a.height / b.height - 1) < 0.03

//refit when the window or browser changes size
export const watchWindow = (dialog, refit) => {
  gameWindow = dialog
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => refit()).observe(dialog)
  window.addEventListener('resize', () => refit())
}
