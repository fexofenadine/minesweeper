import { h } from 'hyperapp'
import '../app.css'
import s from './app.module.css'
import m from '../Menu.module.css'
import Dialog from '../Dialog'
import { MenuItem, SubMenuItem } from '../Menu'
import BackgroundSettings from '../shell/BackgroundSettings'
import Boss, { BossButton } from '../shell/Boss'
import ThemeMenu from '../shell/ThemeMenu'
import WindowControls from '../shell/WindowControls'
import { listen, shellActions, shellState, shortcut } from '../shell/actions'
import { watchWindow } from '../shell/zoom'

//placeholder window until the puzzle engine lands, it exercises the shared shell

export const state = {
  ...shellState(),
}

export const actions = {
  ...shellActions,
  init: () => (state, actions) => {
    window.addEventListener('keydown', actions.press)
    listen(actions)
  },
  //nothing runs yet, so nothing pauses
  pause: () => null,
  press: (event) => (state, actions) => {
    shortcut(event, state, actions)
  },
}

const prevent = (event) => {
  event.preventDefault()
  return false
}

const Window = ({ state, actions }) => (
  <Dialog
    key="a"
    title={state.theme === 'classic' ? 'Takuzu' : 'Takuzu Plus'}
    titleHint="Double-click for 100% zoom"
    onTitleDoubleClick={() => actions.zoom(0)}
    controls={
      <WindowControls
        scale={state.zoom.scale}
        onZoom={actions.zoom}
        paused={false}
        canPause={false}
        onPause={actions.pause}
      />
    }
    onCreate={(dialog) => {
      watchWindow(dialog, actions.fit)
      actions.fit()
    }}
  >
    <ul class={m.root} tabindex={-1} onfocusout={actions.toggleMenu}>
      <MenuItem name="Game" type="game" active={state.menu} onChange={actions.toggleMenu}>
        <SubMenuItem name="Minesweeper" onClick={() => location.assign('../minesweeper/')} />
      </MenuItem>
      <ThemeMenu state={state} actions={actions} />
    </ul>
    <div class={s.root}>
      <p class={s.note}>Binary puzzles are on their way.</p>
    </div>
  </Dialog>
)

export const view = (state, actions) => (
  <main oncontextmenu={prevent} ondragstart={prevent} oncreate={actions.init}>
    <Window state={state} actions={actions} />
    <BossButton key="h" actions={actions} />
    {state.backgroundSettings && (
      <BackgroundSettings key="e" state={state.backgroundSettings} actions={actions} />
    )}
    {state.boss && <Boss key="g" state={state.boss} actions={actions} />}
  </main>
)
