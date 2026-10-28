import { h } from 'hyperapp'
import s from './Game.module.css'
import Dialog from '../Dialog'
import Digit from '../Digit'
import Play from '../Play'
import Button from '../Button'
import WindowControls from '../shell/WindowControls'
import { watchWindow } from '../shell/zoom'
import Menu from './Menu'
import Cell from './Cell'
import { EMPTY, violations } from './rules'

export const running = ({ start, win, dealing }) => start >= 0 && !win && !dealing

const Side = ({ title, disabled, onClick }, children) => (
  <button
    type="button"
    class={s.side}
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

const Game = ({ key, state, actions }) => {
  const { game, hint } = state
  const { n, board, givens, paused } = game
  const errors = state.errors && !paused ? violations(board, n) : null
  const marks = (!paused && hint && hint.marks) || {}
  const left = board.filter((v) => v === EMPTY).length
  return (
    <Dialog
      key={key}
      title={state.theme === 'classic' ? 'Takuzu' : 'Takuzu Plus'}
      titleHint="Double-click for 100% zoom"
      onTitleDoubleClick={() => actions.zoom(0)}
      controls={
        <WindowControls
          scale={state.zoom.scale}
          onZoom={actions.zoom}
          paused={paused}
          canPause={running(game)}
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
          <Digit value={game.dealing ? 0 : left} />
          <div class={s.buttons}>
            <Side
              title="Undo (Ctrl+Z)"
              disabled={!game.history.length || game.win || paused}
              onClick={actions.undo}
            >
              <path d="M8 4L3 8.5 8 13v-3h4.5a2.5 2.5 0 0 1 0 5H9v2h3.5a4.5 4.5 0 0 0 0-9H8z" />
            </Side>
            <Play pressed={false} lose={false} win={game.win} onReset={actions.reset} />
            <Side
              title="Hint (H)"
              disabled={game.dealing || game.win || paused}
              onClick={actions.hint}
            >
              <path d="M9.5 2a4.5 4.5 0 0 0-4.5 4.5h2a2.5 2.5 0 1 1 3.4 2.3c-1 .4-1.9 1.3-1.9 2.6V13h2v-1.6c0-.4.3-.7.7-.8A4.5 4.5 0 0 0 9.5 2zm-1 12.5v2h2v-2z" />
            </Side>
          </div>
          <Digit value={game.time} />
        </div>
        <div class={running(game) && !paused ? s.active : s.inactive} style={{ '--n': n }}>
          {[...board].map((value, i) => (
            <Cell
              i={i}
              value={paused ? EMPTY : value}
              given={!paused && givens[i] !== EMPTY}
              error={errors && errors.has(i)}
              mark={marks[i]}
              onPress={actions.play}
            />
          ))}
          {paused && (
            <div class={s.paused}>
              <Button tabIndex={-1} title="Resume (P)" onClick={() => actions.pause(false)}>
                <svg width="40" height="40">
                  <path d="M14 9v22l17-11z" />
                </svg>
              </Button>
            </div>
          )}
        </div>
        {hint && !paused && (
          <p class={s.hint} role="status">
            {hint.text}
          </p>
        )}
      </div>
    </Dialog>
  )
}

export default Game
