import { h } from 'hyperapp'
import s from './BackgroundSettings.module.css'
import Overlay from '../Overlay'
import Dialog from '../Dialog'
import Button from '../Button'
import { backgrounds, optionsOf } from './backgrounds'

//a control per option type, built from each background's options
const Control = ({ option, value, onChange }) => {
  if (option.type === 'toggle') {
    return (
      <input
        type="checkbox"
        class={s.check}
        checked={value}
        onchange={(event) => onChange(event.target.checked)}
      />
    )
  }
  if (option.type === 'select') {
    return (
      <span class={s.frame}>
        <select class={s.select} onchange={(event) => onChange(event.target.value)}>
          {option.choices.map(([choice, name]) => (
            <option value={choice} selected={choice === value}>
              {name}
            </option>
          ))}
        </select>
      </span>
    )
  }
  return (
    <span class={s.range}>
      <input
        type="range"
        class={s.slider}
        min={option.min}
        max={option.max}
        step={option.step}
        value={value}
        oninput={(event) => onChange(Number(event.target.value))}
      />
      <span class={s.value}>{option.format ? option.format(value) : value}</span>
    </span>
  )
}

const BackgroundSettings = ({ key, state, actions }) => {
  const background = backgrounds[state.id]
  return (
    <Overlay
      key={key}
      onKeyDown={(event) => event.keyCode === 27 && actions.toggleBackgroundSettings()}
    >
      <Dialog title={`${background.name} Settings`} onClose={actions.toggleBackgroundSettings}>
        <form class={s.root} autocomplete="off" onsubmit={actions.submitBackgroundSettings}>
          {optionsOf(state.id).map((option) => (
            <label class={s.row}>
              <span class={s.name}>{option.label}:</span>
              <Control
                option={option}
                value={state.draft[option.key]}
                onChange={(value) => actions.changeBackgroundSettings({ [option.key]: value })}
              />
            </label>
          ))}
          <p class={s.credit}>{background.credit}</p>
          <div class={s.footer}>
            <Button onCreate={(el) => el.focus()}>
              <span class={s.button}>OK</span>
            </Button>
            <Button type="button" onClick={actions.toggleBackgroundSettings}>
              <span class={s.button}>Cancel</span>
            </Button>
            <Button type="button" onClick={actions.resetBackgroundSettings}>
              <span class={s.button}>Defaults</span>
            </Button>
          </div>
        </form>
      </Dialog>
    </Overlay>
  )
}

export default BackgroundSettings
