import { h } from 'hyperapp'
import s from './Game.module.css'
import Dialog from '../Dialog'
import Digit from '../Digit'
import Play from '../Play'
import Button from '../Button'
import SideButton, { HintIcon, UndoIcon } from '../shell/SideButton'
import WindowControls from '../shell/WindowControls'
import { hangBelow, watchWindow } from '../shell/zoom'
import Menu from './Menu'
import Cell from './Cell'
import { EMPTY, violations } from './rules'

export const running = ({ start, win, dealing }) => start >= 0 && !win && !dealing

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
            <SideButton
              title="Undo (Ctrl+Z)"
              disabled={!game.history.length || game.win || paused}
              onClick={actions.undo}
            >
              <UndoIcon />
            </SideButton>
            <Play pressed={false} lose={false} win={game.win} onReset={actions.reset} />
            <SideButton
              title="Hint (H)"
              disabled={game.dealing || game.win || paused}
              onClick={actions.hint}
            >
              <HintIcon />
            </SideButton>
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
          <p class={s.hint} role="status" {...hangBelow}>
            {hint.text}
          </p>
        )}
      </div>
    </Dialog>
  )
}

export default Game
