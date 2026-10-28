import { makeSheet } from './Boss'
import { load, save } from './storage'
import { themes } from './themes'
import { backgroundFor, configure, defaults, loadSettings, saveSettings } from './backgrounds'
import { applyZoom, fitZoom, loadZoom, measureFit, sameSize, saveZoom, stepZoom } from './zoom'

//state and actions every game window shares, spread into each game's own
//games provide pause(paused) and press(event), the shell calls them

const loadTheme = () => {
  const theme = load('theme')
  return themes.some(([id]) => id === theme) ? theme : 'classic'
}

export const shellState = () => ({
  menu: null,
  theme: loadTheme(),
  boss: null,
  backgrounds: loadSettings(),
  backgroundSettings: null,
  zoom: { chosen: loadZoom(), scale: loadZoom(), seen: null },
  portrait: Boolean(window.matchMedia && matchMedia('(orientation: portrait)').matches),
})

export const listen = (actions) => {
  //leaving the page pauses, coming back waits for play
  document.addEventListener('visibilitychange', () => document.hidden && actions.pause(true))
  window.addEventListener('blur', () => actions.pause(true))
  if (window.matchMedia) {
    matchMedia('(orientation: portrait)').addEventListener('change', (event) =>
      actions.setPortrait(event.matches),
    )
  }
}

//the key code a game should act on, or null once the shell has handled it
export const shortcut = (event, state, actions) => {
  //leave typing in a dialog and browser shortcuts alone
  const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)
  if (typing || event.ctrlKey || event.metaKey || event.altKey) return null
  if (event.keyCode === 27) {
    //an open menu closes first, as in windows
    if (state.menu) actions.closeMenu()
    else actions.boss()
    return null
  }
  //the spreadsheet only answers to esc
  return state.boss ? null : event.keyCode
}

export const shellActions = {
  closeMenu: () => ({ menu: null }),
  setPortrait: (portrait) => ({ portrait }),
  //esc covers everything with a spreadsheet and pauses the game
  boss:
    () =>
    ({ boss }, actions) => {
      if (boss) return { boss: null }
      actions.pause(true)
      return { menu: null, boss: makeSheet() }
    },
  //a live draft, cancel restores the saved settings
  toggleBackgroundSettings:
    () =>
    ({ theme, backgrounds, backgroundSettings }) => {
      if (backgroundSettings) {
        configure(backgroundSettings.id, backgrounds[backgroundSettings.id])
        return { backgroundSettings: null }
      }
      const id = backgroundFor(theme)
      return { menu: null, backgroundSettings: id && { id, draft: { ...backgrounds[id] } } }
    },
  changeBackgroundSettings:
    (values) =>
    ({ backgroundSettings: { id, draft } }) => {
      const next = { ...draft, ...values }
      configure(id, next)
      return { backgroundSettings: { id, draft: next } }
    },
  resetBackgroundSettings: () => (state, actions) =>
    actions.changeBackgroundSettings(defaults(state.backgroundSettings.id)),
  submitBackgroundSettings:
    (event) =>
    ({ backgrounds, backgroundSettings: { id, draft } }) => {
      event.preventDefault()
      const next = { ...backgrounds, [id]: draft }
      saveSettings(next)
      return { backgrounds: next, backgroundSettings: null }
    },
  //shrink the chosen zoom to fit, only for a new level, theme or browser size
  fit:
    () =>
    ({ zoom }) => {
      const { fit, size } = measureFit(zoom.scale)
      if (sameSize(size, zoom.seen)) return null
      const scale = fitZoom(zoom.chosen, fit)
      applyZoom(scale)
      return { zoom: { ...zoom, scale, seen: size } }
    },
  //step from the shown size, or back to 100%
  zoom:
    (direction) =>
    ({ zoom }) => {
      const { fit, size } = measureFit(zoom.scale)
      const chosen = direction ? stepZoom(zoom.scale, direction) : 1
      const scale = direction ? chosen : fitZoom(chosen, fit)
      saveZoom(chosen)
      applyZoom(scale)
      return { zoom: { chosen, scale, seen: size } }
    },
  setTheme: (theme) => () => {
    save('theme', theme)
    document.documentElement.dataset.theme = theme
    return {
      menu: null,
      theme,
    }
  },
  toggleMenu:
    (event) =>
    ({ menu }) => {
      const { name } = event.currentTarget.dataset
      if (event.type === 'click') {
        return { menu: menu && menu[name] ? null : { [name]: true } }
      }
      if (event.type === 'mouseenter') {
        return menu ? { menu: { [name]: true } } : null
      }
      if (event.type === 'focusout' && !event.currentTarget.contains(event.relatedTarget)) {
        return { menu: null }
      }
      return null
    },
}
