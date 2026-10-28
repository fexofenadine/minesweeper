import { h } from 'hyperapp'
import s from './Game.module.css'
import Dialog from './Dialog'
import Menu from './Menu'
import Digit from './Digit'
import Play from './Play'
import Cell from './Cell'
import Button from './Button'
import { watchWindow } from './zoom'

const running = ({ start, win, lose }) => start >= 0 && !win && !lose

//title bar pause and zoom buttons in place of a resize grip
const Zoom = ({ scale, onZoom, game, onPause }) => [
  <Button
    tabIndex={-1}
    title={game.paused ? 'Resume (P)' : 'Pause (P)'}
    disabled={!running(game)}
    onClick={() => onPause()}
  >
    <svg width="13" height="11">
      <path d={game.paused ? 'M4 1.5v8l6-4z' : 'M4 2h2v7H4zM8 2h2v7H8z'} />
    </svg>
  </Button>,
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

//wide boards on portrait screens are shown transposed, cells keep their own x and y
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
    controls={
      <Zoom
        scale={state.zoom.scale}
        onZoom={actions.zoom}
        game={state.game}
        onPause={actions.pause}
      />
    }
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
          <div class={running(state.game) && !state.game.paused ? s.active : s.inactive}>
            {row.map(({ cell, x, y }) => (
              <Cell
                x={x}
                y={y}
                pressed={state.game.pressed}
                pressedX={state.game.pressedX}
                pressedY={state.game.pressedY}
                group={state.game.group}
                opened={cell.opened && !state.game.paused}
                mined={cell.mined}
                flag={cell.flag && !state.game.paused}
                mark={cell.mark && !state.game.paused}
                num={cell.num}
                hint={
                  !state.game.paused && state.hint && state.hint.marks[y * state.game.width + x]
                }
                lose={state.game.lose}
                onDown={actions.down}
                onMove={actions.move}
                onTouch={actions.touch}
                onChord={actions.chord}
              />
            ))}
          </div>
        ))}
        {state.game.paused && (
          <div class={s.paused}>
            <Button tabIndex={-1} title="Resume (P)" onClick={() => actions.pause(false)}>
              <svg width="40" height="40">
                <path d="M14 9v22l17-11z" />
              </svg>
            </Button>
          </div>
        )}
      </div>
      {state.hint && !state.game.paused && (
        <p class={s.hint} role="status">
          {state.hint.text}
        </p>
      )}
    </div>
  </Dialog>
)

export default Game
