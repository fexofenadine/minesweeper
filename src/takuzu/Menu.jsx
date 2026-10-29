import { h } from 'hyperapp'
import m from '../Menu.module.css'
import { MenuItem, Separator, SubMenuItem } from '../Menu'
import ThemeMenu from '../shell/ThemeMenu'
import { gameLinks } from '../shell/GameLinks'
import { sizes } from './rules'
import { levels } from './techniques'

export const levelNames = ['Easy', 'Medium', 'Tricky', 'Hard', 'Expert']

//6x6 has no expert, by choice
export const allowed = (n, level) => !(n === 6 && level === levelNames.length - 1)

//the level asked for, or the hardest one below it that the size allows
export const fallback = (n, level) => (allowed(n, level) ? level : fallback(n, level - 1))

const Menu = ({ state, actions }) => (
  <ul class={m.root} tabindex={-1} onfocusout={actions.toggleMenu}>
    <MenuItem name="Game" type="game" active={state.menu} onChange={actions.toggleMenu}>
      <SubMenuItem name="New" hotKey="F2" onClick={() => actions.reset()} />
      <SubMenuItem name="Undo" hotKey="Ctrl+Z" onClick={() => actions.undo()} />
      <SubMenuItem name="Hint" hotKey="H" onClick={() => actions.hint()} />
      <Separator />
      {levels.map((_, level) => (
        <SubMenuItem
          name={levelNames[level]}
          checked={state.game.level === level}
          disabled={!allowed(state.game.n, level)}
          onClick={() => actions.reset({ level })}
        />
      ))}
      <Separator />
      <SubMenuItem name="Show Errors" checked={state.errors} onClick={actions.toggleErrors} />
      <Separator />
      <SubMenuItem name="Best Times..." onClick={actions.toggleBestTime} />
      <Separator />
      {gameLinks('takuzu')}
    </MenuItem>
    <MenuItem name="Size" type="size" active={state.menu} onChange={actions.toggleMenu}>
      {sizes.map((n) => (
        <SubMenuItem
          name={`${n} × ${n}`}
          checked={state.game.n === n}
          onClick={() => actions.reset({ n })}
        />
      ))}
    </MenuItem>
    <ThemeMenu state={state} actions={actions}>
      {state.theme === 'matrix' && <Separator />}
      {state.theme === 'matrix' && (
        <SubMenuItem name="Rain Glyphs" checked={state.rain} onClick={actions.toggleRain} />
      )}
    </ThemeMenu>
    <MenuItem name="Help" type="help" active={state.menu} onChange={actions.toggleMenu}>
      <SubMenuItem name="How to Play..." onClick={actions.toggleHowTo} />
      <Separator />
      <SubMenuItem name="About Takuzu Plus..." onClick={actions.toggleAbout} />
    </MenuItem>
  </ul>
)

export default Menu
