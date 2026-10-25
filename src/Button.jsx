import { h } from 'hyperapp'
import s from './Button.module.css'

const Button = ({ key, type, tabIndex, title, disabled, onClick, onCreate }, children) => (
  <button
    key={key}
    class={s.root}
    type={type}
    tabindex={tabIndex}
    title={title}
    disabled={disabled}
    onclick={onClick}
    oncreate={onCreate}
  >
    {children}
  </button>
)

export default Button
