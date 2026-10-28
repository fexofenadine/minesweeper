import { h } from 'hyperapp'
import s from './Overlay.module.css'

//esc closes the dialog, so it never reaches the boss key
const keyDown = (onKeyDown) => (event) => {
  if (event.keyCode === 27 && onKeyDown) event.stopPropagation()
  if (onKeyDown) onKeyDown(event)
}

const Overlay = ({ key, onKeyDown }, children) => (
  <section key={key} class={s.root} tabindex={-1} onkeydown={keyDown(onKeyDown)}>
    <div class={s.table}>
      <div class={s.cell}>{children}</div>
    </div>
  </section>
)

export default Overlay
