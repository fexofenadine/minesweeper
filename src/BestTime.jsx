import { h } from 'hyperapp'
import s from './BestTime.module.css'
import Overlay from './Overlay'
import Dialog from './Dialog'
import Button from './Button'

const tabs = [
  { id: 'clean', name: 'No hints' },
  { id: 'hinted', name: 'Hints used' },
]

const BestTime = ({ key, state, actions }) => (
  <Overlay key={key} onKeyDown={(event) => event.keyCode === 27 && actions.toggleBestTime()}>
    <Dialog title="Fastest Mine Sweepers" onClose={actions.toggleBestTime}>
      <div class={s.root}>
        <div class={s.tabs} role="tablist">
          {tabs.map((tab) => (
            <button
              type="button"
              role="tab"
              tabindex={-1}
              aria-selected={state.tab === tab.id}
              class={state.tab === tab.id ? s.tabActive : s.tab}
              onclick={() => actions.setBestTimeTab(tab.id)}
            >
              {tab.name}
            </button>
          ))}
        </div>
        <table class={s.table}>
          <tbody>
            {state[state.tab].map((row) => (
              <tr>
                <td class={s.cell}>{row.level}:</td>
                <td class={s.cell}>{row.time && `${row.time} seconds`}</td>
                <td class={s.cell}>{row.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div class={s.footer}>
          <Button type="button" onClick={actions.resetBestTime}>
            <span class={s.button}>Reset Scores</span>
          </Button>
          <Button type="button" onClick={actions.toggleBestTime} onCreate={(el) => el.focus()}>
            <span class={s.button}>OK</span>
          </Button>
        </div>
      </div>
    </Dialog>
  </Overlay>
)

export default BestTime
