import { h } from 'hyperapp'
import b from '../BestTime.module.css'
import s from './BestTimes.module.css'
import Overlay from '../Overlay'
import Dialog from '../Dialog'
import Button from '../Button'
import { sizes } from './rules'
import { allowed, levelNames } from './Menu'

const tabs = [
  { id: 'clean', name: 'No hints' },
  { id: 'hinted', name: 'Hints used' },
]

//a size a row, a level a column, empty slots stay blank
const BestTimes = ({ key, state, actions }) => (
  <Overlay key={key} onKeyDown={(event) => event.keyCode === 27 && actions.toggleBestTime()}>
    <Dialog title="Fastest Takuzu Solvers" onClose={actions.toggleBestTime}>
      <div class={b.root}>
        <div class={b.tabs} role="tablist">
          {tabs.map((tab) => (
            <button
              type="button"
              role="tab"
              tabindex={-1}
              aria-selected={state.tab === tab.id}
              class={state.tab === tab.id ? b.tabActive : b.tab}
              onclick={() => actions.setBestTimeTab(tab.id)}
            >
              {tab.name}
            </button>
          ))}
        </div>
        <table class={s.table}>
          <thead>
            <tr>
              <th />
              {levelNames.map((name) => (
                <th class={s.level}>{name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sizes.map((n) => (
              <tr>
                <th class={s.size}>
                  {n} × {n}
                </th>
                {levelNames.map((_, level) => {
                  const best = state[state.tab][`${n}.${level}`]
                  return (
                    <td class={s.slot}>
                      {!allowed(n, level) && '–'}
                      {best && <span class={s.time}>{best.time} s</span>}
                      {best && <span class={s.name}>{best.name}</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div class={b.footer}>
          <Button type="button" onClick={actions.resetBestTime}>
            <span class={b.button}>Reset Scores</span>
          </Button>
          <Button type="button" onClick={actions.toggleBestTime} onCreate={(el) => el.focus()}>
            <span class={b.button}>OK</span>
          </Button>
        </div>
      </div>
    </Dialog>
  </Overlay>
)

export default BestTimes
