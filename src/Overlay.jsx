import { h } from 'hyperapp'
import s from './Overlay.module.css'

//esc closes the dialog, so it never reaches the boss key
const keyDown = (onKeyDown) => (event) => {
  if (event.keyCode === 27 && onKeyDown) event.stopPropagation()
  if (onKeyDown) onKeyDown(event)
}

//a tap that opened the dialog sends its click afterwards to whatever is under the finger then
//so pointer clicks count only once a press began inside, keyboard clicks (detail 0) always do
export const guardClicks = (el) => {
  let pressed = false
  el.addEventListener('pointerdown', () => (pressed = true), true)
  el.addEventListener(
    'click',
    (event) => {
      if (pressed || !event.detail) return
      event.preventDefault()
      event.stopPropagation()
    },
    true,
  )
}

const Overlay = ({ key, onKeyDown }, children) => (
  <section
    key={key}
    class={s.root}
    tabindex={-1}
    onkeydown={keyDown(onKeyDown)}
    oncreate={guardClicks}
  >
    <div class={s.table}>
      <div class={s.cell}>{children}</div>
    </div>
  </section>
)

export default Overlay
