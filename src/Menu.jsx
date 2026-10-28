import { h } from 'hyperapp'
import s from './Menu.module.css'
import ThemeMenu from './shell/ThemeMenu'

export const SubMenuItem = ({ key, name, hotKey, checked, onClick }, children) => (
  <li key={key} class={s.item}>
    <button type="button" class={s.option} tabindex={-1} onclick={onClick}>
      {checked && (
        <svg class={s.check} width="7" height="7">
          <path d="M0 4.5L2.5 7 7 2.5V0L2.5 4.5 0 2v2.5z" />
        </svg>
      )}
      {name}
      {hotKey && <span class={s.hotKey}>{hotKey}</span>}
    </button>
    {children.length > 0 && (
      <div class={s.menu}>
        <ul class={s.list}>{children}</ul>
      </div>
    )}
  </li>
)

export const MenuItem = ({ key, name, type, active, onChange }, children) => (
  <li key={key} class={active && active[type] ? s.columnActive : s.column}>
    <button
      type="button"
      class={s.button}
      tabindex={-1}
      data-name={type}
      onclick={onChange}
      onmouseenter={onChange}
    >
      {name}
    </button>
    {children.length > 0 && (
      <div class={s.menu}>
        <ul class={s.list}>{children}</ul>
      </div>
    )}
  </li>
)

export const Separator = () => <li class={s.separator} />

const Menu = ({ state, actions }) => (
  <ul class={s.root} tabindex={-1} onfocusout={actions.toggleMenu}>
    <MenuItem name="Game" type="game" active={state.menu} onChange={actions.toggleMenu}>
      <SubMenuItem name="New" hotKey="F2" onClick={() => actions.reset()} />
      <SubMenuItem name="Hint" hotKey="H" onClick={() => actions.hint()} />
      <Separator />
      <SubMenuItem
        name="Beginner"
        checked={state.game.level === 'beginner'}
        onClick={() => actions.reset({ level: 'beginner' })}
      />
      <SubMenuItem
        name="Intermediate"
        checked={state.game.level === 'intermediate'}
        onClick={() => actions.reset({ level: 'intermediate' })}
      />
      <SubMenuItem
        name="Expert"
        checked={state.game.level === 'expert'}
        onClick={() => actions.reset({ level: 'expert' })}
      />
      <SubMenuItem
        name="Extreme"
        checked={state.game.level === 'extreme'}
        onClick={() => actions.reset({ level: 'extreme' })}
      />
      <SubMenuItem
        name="Custom..."
        checked={state.game.level === 'custom'}
        onClick={actions.toggleCustomField}
      />
      <Separator />
      <SubMenuItem name="Marks (?)" checked={state.marks} onClick={actions.toggleMarks} />
      <SubMenuItem
        name="Safe First Click"
        checked={state.safeStart || state.noGuess}
        onClick={actions.toggleSafeStart}
      />
      <SubMenuItem name="No Guessing" checked={state.noGuess} onClick={actions.toggleNoGuess} />
      <Separator />
      <SubMenuItem name="Best Times..." onClick={actions.toggleBestTime} />
    </MenuItem>
    <ThemeMenu state={state} actions={actions} />
    <MenuItem name="Help" type="help" active={state.menu} onChange={actions.toggleMenu}>
      <SubMenuItem name="About Minesweeper Plus..." onClick={actions.toggleAbout} />
    </MenuItem>
  </ul>
)

export default Menu
