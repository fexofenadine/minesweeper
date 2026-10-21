import { expect, it } from 'vitest'
import { clampScale } from './Grip'

it('keeps the window size between half and four times, in steps of 0.05', () => {
  expect(clampScale(0.1)).toBe(0.5)
  expect(clampScale(10)).toBe(4)
  expect(clampScale(1.234)).toBe(1.25)
  expect(clampScale(1)).toBe(1)
})
