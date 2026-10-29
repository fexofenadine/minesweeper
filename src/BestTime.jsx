import { h } from 'hyperapp'
import s from './BestTime.module.css'
import Overlay from './Overlay'
import Dialog from './Dialog'
import Button from './Button'
import Tabs from './shell/Tabs'

const tabs = [
  { id: 'clean', name: 'No hints' },
  { id: 'hinted', name: 'Hints used' },
]

const BestTime = ({ key, state, actions }) => (
  <Overlay key={key} onKeyDown={(event) => event.keyCode === 27 && actions.toggleBestTime()}>
    <Dialog title="Fastest Mine Sweepers" onClose={actions.toggleBestTime}>
      <div class={s.root}>
        <Tabs tabs={tabs} active={state.tab} onSelect={actions.setBestTimeTab} />
        <table class={s.table}>
          <tbody>
            {state[state.tab].map((row) => (
              <tr>
                <td class={s.cell}>{row.level}:</td>
                <td class={s.cell}>{row.time} seconds</td>
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
