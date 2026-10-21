import { h } from 'hyperapp'
import s from './Grip.module.css'
import { save } from './storage'

const root = document.documentElement

export const clampScale = (scale) => Math.round(Math.min(4, Math.max(0.5, scale)) * 20) / 20

const setScale = (scale) => {
  root.style.setProperty('--scale', scale)
  save('scale', scale)
}

//the window is centred, so its corner moves half as far as it grows
const resize = (event) => {
  event.preventDefault()
  const grip = event.currentTarget
  const rect = grip.offsetParent.getBoundingClientRect()
  const scale = parseFloat(root.style.getPropertyValue('--scale')) || 1
  const move = ({ clientX, clientY }) => {
    const wide = (rect.width + 2 * (clientX - event.clientX)) / rect.width
    const tall = (rect.height + 2 * (clientY - event.clientY)) / rect.height
    setScale(clampScale(scale * (Math.abs(wide - 1) > Math.abs(tall - 1) ? wide : tall)))
  }
  const stop = () => {
    grip.removeEventListener('pointermove', move)
    grip.removeEventListener('pointerup', stop)
    grip.removeEventListener('pointercancel', stop)
  }
  grip.setPointerCapture(event.pointerId)
  grip.addEventListener('pointermove', move)
  grip.addEventListener('pointerup', stop)
  grip.addEventListener('pointercancel', stop)
}

const Grip = () => (
  <div class={s.bar}>
    <div
      class={s.grip}
      title="Drag to resize, double click to reset"
      onpointerdown={resize}
      ondblclick={() => setScale(1)}
    />
  </div>
)

export default Grip
