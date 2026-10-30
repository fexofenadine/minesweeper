import { expect, it } from 'vitest'
import { guardClicks } from './Overlay'

const click = (target, detail) =>
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail }))

it('ignores the click left over from the tap that opened a dialog', () => {
  const overlay = document.createElement('section')
  const button = document.createElement('button')
  overlay.appendChild(button)
  guardClicks(overlay)
  let clicks = 0
  button.addEventListener('click', () => clicks++)

  expect(click(button, 1)).toBe(false)
  expect(clicks).toBe(0)
  //enter on a button or in a form clicks with detail 0
  click(button, 0)
  expect(clicks).toBe(1)
  button.dispatchEvent(new Event('pointerdown', { bubbles: true }))
  click(button, 1)
  expect(clicks).toBe(2)
})
