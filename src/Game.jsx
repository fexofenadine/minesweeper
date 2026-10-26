import { h } from 'hyperapp'
import s from './Game.module.css'
import Dialog from './Dialog'
import Menu from './Menu'
import Digit from './Digit'
import Play from './Play'
import Cell from './Cell'
import Button from './Button'
import { watchWindow } from './zoom'

//title bar zoom buttons in place of a resize grip
const Zoom = ({ scale, onZoom }) => [
  <Button tabIndex={-1} title="Zoom out" disabled={scale <= 0.5} onClick={() => onZoom(-1)}>
    <svg width="13" height="11">
      <path d="M3 5h8v2H3z" />
    </svg>
  </Button>,
  <Button tabIndex={-1} title="Zoom in" disabled={scale >= 4} onClick={() => onZoom(1)}>
    <svg width="13" height="11">
      <path d="M6 2h2v3h3v2H8v3H6V7H3V5h3z" />
    </svg>
  </Button>,
]

//a wide board on a portrait screen is shown transposed, columns as rows, so it suits the screen
//neighbours stay neighbours, so only the view changes and cells keep their own x and y
export const transposed = ({ portrait, game }) => portrait && game.width > game.height

const rowsOf = (state) => {
  const { field } = state.game
  if (!transposed(state)) return field.map((row, y) => row.map((cell, x) => ({ cell, x, y })))
  return field[0].map((_, x) => field.map((row, y) => ({ cell: row[x], x, y })))
}

const Game = ({ key, state, actions }) => (
  <Dialog
    key={key}
    title={state.theme === 'classic' ? 'Minesweeper' : 'Minesweeper Plus'}
    titleHint="Double-click for 100% zoom"
    onTitleDoubleClick={() => actions.zoom(0)}
    controls={<Zoom scale={state.zoom.scale} onZoom={actions.zoom} />}
    onCreate={(dialog) => {
      watchWindow(dialog, actions.fit)
      actions.fit()
    }}
  >
    <Menu state={state} actions={actions} />
    <div class={s.root}>
      <div class={s.scoreboard}>
        <Digit value={state.game.flags} />
        <Play
          pressed={state.game.pressed}
          lose={state.game.lose}
          win={state.game.win}
          onReset={actions.reset}
        />
        <Digit value={state.game.time} />
      </div>
      <div class={state.game.lose ? s.fieldLost : s.field}>
        {rowsOf(state).map((row) => (
          <div class={state.game.win || state.game.lose ? s.inactive : s.active}>
            {row.map(({ cell, x, y }) => (
              <Cell
                x={x}
                y={y}
                pressed={state.game.pressed}
                pressedX={state.game.pressedX}
                pressedY={state.game.pressedY}
                group={state.game.group}
                opened={cell.opened}
                mined={cell.mined}
                flag={cell.flag}
                mark={cell.mark}
                num={cell.num}
                hint={state.hint && state.hint.marks[y * state.game.width + x]}
                lose={state.game.lose}
                onDown={actions.down}
                onMove={actions.move}
                onTouch={actions.touch}
                onChord={actions.chord}
              />
            ))}
          </div>
        ))}
      </div>
      {state.hint && (
        <p class={s.hint} role="status">
          {state.hint.text}
        </p>
      )}
    </div>
  </Dialog>
)

export default Game
