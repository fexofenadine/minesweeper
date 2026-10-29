import { h } from 'hyperapp'
import s from './SideButton.module.css'

//a small scoreboard button beside the face, drawn like it
const SideButton = ({ title, disabled, onClick }, children) => (
  <button
    type="button"
    class={s.root}
    tabindex={-1}
    title={title}
    disabled={disabled}
    onclick={() => onClick()}
  >
    <svg width="19" height="19">
      {children}
    </svg>
  </button>
)

export const HintIcon = () => (
  <path d="M9.5 2a4.5 4.5 0 0 0-4.5 4.5h2a2.5 2.5 0 1 1 3.4 2.3c-1 .4-1.9 1.3-1.9 2.6V13h2v-1.6c0-.4.3-.7.7-.8A4.5 4.5 0 0 0 9.5 2zm-1 12.5v2h2v-2z" />
)

export const UndoIcon = () => (
  <path d="M8 4L3 8.5 8 13v-3h4.5a2.5 2.5 0 0 1 0 5H9v2h3.5a4.5 4.5 0 0 0 0-9H8z" />
)

export default SideButton
