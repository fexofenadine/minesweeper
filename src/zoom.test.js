import { expect, it } from 'vitest'
import { MIN_FIT, fitZoom, loadZoom, sameSize, stepZoom } from './zoom'

it('steps through the zoom levels and stops at the ends', () => {
  expect(stepZoom(1, 1)).toBe(1.25)
  expect(stepZoom(1, -1)).toBe(0.875)
  expect(stepZoom(0.93, 1)).toBe(1)
  expect(stepZoom(0.93, -1)).toBe(0.875)
  expect(stepZoom(4, 1)).toBe(4)
  expect(stepZoom(0.5, -1)).toBe(0.5)
})

it('keeps the chosen zoom when the window fits', () => {
  expect(fitZoom(1.5, 2)).toBe(1.5)
  expect(fitZoom(1, 1)).toBe(1)
})

it('shrinks to fit, but never below readable', () => {
  expect(fitZoom(1, 0.8)).toBe(0.8)
  expect(fitZoom(1, 0.789)).toBe(0.78)
  expect(fitZoom(1, 0.3)).toBe(MIN_FIT)
  //a zoom chosen below the readable limit is left alone
  expect(fitZoom(0.5, 0.3)).toBe(0.5)
})

it('treats the small drift between zoom levels as the same size', () => {
  const size = { width: 649, height: 442, room: '1180x620' }
  expect(sameSize(size, { width: 646.5, height: 438, room: '1180x620' })).toBe(true)
  expect(sameSize(size, { width: 505, height: 374, room: '1180x620' })).toBe(false)
  expect(sameSize(size, { ...size, room: '800x500' })).toBe(false)
  expect(sameSize(size, null)).toBe(false)
})

it('loads a saved zoom within limits', () => {
  localStorage.setItem('scale', '9')
  expect(loadZoom()).toBe(4)
  localStorage.setItem('scale', 'x')
  expect(loadZoom()).toBe(1)
  localStorage.removeItem('scale')
  expect(loadZoom()).toBe(1)
})
