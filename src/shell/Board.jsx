import { h } from 'hyperapp'
import s from './Board.module.css'
import Button from '../Button'
import { hangBelow } from './zoom'

//the play button over a paused board
export const PausedCover = ({ onResume }) => (
  <div class={s.paused}>
    <Button tabIndex={-1} title="Resume (P)" onClick={() => onResume()}>
      <svg width="40" height="40">
        <path d="M14 9v22l17-11z" />
      </svg>
    </Button>
  </div>
)

//the explanation under the board, hanging below the window's place so the board never moves
export const HintPanel = ({ text }) => (
  <p class={s.hint} role="status" {...hangBelow}>
    {text}
  </p>
)
