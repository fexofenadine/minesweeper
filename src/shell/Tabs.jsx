import { h } from 'hyperapp'
import s from '../BestTime.module.css'

//the tab row above a dialog's table
const Tabs = ({ tabs, active, onSelect }) => (
  <div class={s.tabs} role="tablist">
    {tabs.map((tab) => (
      <button
        type="button"
        role="tab"
        tabindex={-1}
        aria-selected={active === tab.id}
        class={active === tab.id ? s.tabActive : s.tab}
        onclick={() => onSelect(tab.id)}
      >
        {tab.name}
      </button>
    ))}
  </div>
)

export default Tabs
