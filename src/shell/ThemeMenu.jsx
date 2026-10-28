import { h } from 'hyperapp'
import { MenuItem, Separator, SubMenuItem } from '../Menu'
import { backgroundFor } from './backgrounds'
import { themes } from './themes'

//the theme menu every game shares, a game's own theme options go after it
const ThemeMenu = ({ state, actions }, children) => (
  <MenuItem name="Theme" type="theme" active={state.menu} onChange={actions.toggleMenu}>
    {themes.map(([theme, name]) => (
      <SubMenuItem
        name={name}
        checked={state.theme === theme}
        onClick={() => actions.setTheme(theme)}
      />
    ))}
    {backgroundFor(state.theme) && <Separator />}
    {backgroundFor(state.theme) && (
      <SubMenuItem name="Background Settings..." onClick={actions.toggleBackgroundSettings} />
    )}
    {children}
  </MenuItem>
)

export default ThemeMenu
