import { h } from 'hyperapp'
import s from './Cell.module.css'
import { EMPTY } from './rules'

const hintClass = {
  source: s.hintSource,
  zero: s.hintPlace,
  one: s.hintPlace,
  wrong: s.hintWrong,
}

//a hint shows the value it places faintly in the empty cell
const glyphOf = (value, mark) => {
  if (value !== EMPTY) return String(value)
  if (mark === 'zero') return '0'
  if (mark === 'one') return '1'
  return ''
}

const Cell = ({ i, value, given, error, mark, onPress }) => (
  <button
    type="button"
    tabindex={-1}
    class={[
      value === EMPTY ? s.empty : value ? s.one : s.zero,
      given && s.given,
      error && s.error,
      value === EMPTY && mark && s.ghost,
      mark && hintClass[mark],
    ]
      .filter(Boolean)
      .join(' ')}
    onpointerdown={(event) => onPress({ event, i })}
  >
    {glyphOf(value, mark)}
  </button>
)

export default Cell
