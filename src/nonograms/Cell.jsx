import { h } from 'hyperapp'
import s from './Cell.module.css'
import { EMPTY, FILL } from './rules'

const hintClass = {
  source: s.hintSource,
  fill: s.hintPlace,
  cross: s.hintPlace,
  wrong: s.hintWrong,
}

//a hint shows what it places faintly in the empty cell
const classOf = (value, win, mark) => {
  if (value === FILL) return s.fill
  if (value !== EMPTY || win) return s.cross
  if (mark === 'fill') return s.ghostFill
  if (mark === 'cross') return s.ghostCross
  return s.empty
}

//data-cell lets a stroke find the cell under the pointer
const Cell = ({ i, value, win, mark, style, onPress }) => (
  <button
    type="button"
    tabindex={-1}
    data-cell={i}
    class={[classOf(value, win, mark), win && value !== FILL && s.blank, mark && hintClass[mark]]
      .filter(Boolean)
      .join(' ')}
    style={style}
    onpointerdown={(event) => onPress({ event, i })}
  />
)

export default Cell
