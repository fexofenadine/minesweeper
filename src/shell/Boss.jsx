import { h } from 'hyperapp'
import s from './Boss.module.css'
import Button from '../Button'

const departments = [
  'Engineering',
  'Sales',
  'Marketing',
  'Customer support',
  'Operations',
  'Finance',
  'People',
  'Facilities',
  'IT',
  'Legal',
]
const headings = [
  'Department',
  'Jul',
  'Aug',
  'Sep',
  'Q3 total',
  'Budget',
  'Variance',
  '% of budget',
]
const columns = 'ABCDEFGHIJKLMN'.split('')
const icon =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='2' fill='%232b6cb0'/%3E%3Cpath d='M3 5.5h10M3 8.5h10M3 11.5h10M6.5 3v10M10 3v10' stroke='%23fff'/%3E%3C/svg%3E"

//new figures every time, the layout stays the same
export const makeSheet = () => ({
  rows: departments.map((name) => {
    const base = 20000 + Math.random() * 180000
    const spend = [0, 1, 2].map(() => Math.round(base * (0.9 + Math.random() * 0.2)))
    const total = spend[0] + spend[1] + spend[2]
    const budget = Math.round((total * (0.92 + Math.random() * 0.16)) / 1000) * 1000
    return [name, ...spend, total, budget, budget - total]
  }),
})

const money = (n) => (n < 0 ? `(${(-n).toLocaleString()})` : n.toLocaleString())

const Row = ({ number, cells, total }) => (
  <tr class={total ? s.total : null}>
    <th class={s.number}>{number}</th>
    {columns.map((_, i) => {
      const value = cells && cells[i]
      const negative = typeof value === 'number' && value < 0 && i === 6
      return (
        <td
          class={[i > 0 && s.figure, negative && s.negative, total && i === 4 && s.selected]
            .filter(Boolean)
            .join(' ')}
        >
          {typeof value === 'number' ? money(value) : value}
        </td>
      )
    })}
  </tr>
)

let saved = null

//swap the tab title and icon too, and stop the background drawing underneath
const cover = (el) => {
  const link = document.querySelector('link[rel~="icon"]')
  saved = { title: document.title, href: link && link.getAttribute('href') }
  document.title = 'Q3 budget'
  if (link) link.setAttribute('href', icon)
  document.documentElement.dataset.boss = 'true'
  el.focus()
}

const uncover = () => {
  const link = document.querySelector('link[rel~="icon"]')
  document.title = saved.title
  if (link && saved.href) link.setAttribute('href', saved.href)
  delete document.documentElement.dataset.boss
}

const Boss = ({ key, state, actions }) => {
  const sums = [1, 2, 3, 4, 5, 6].map((i) => state.rows.reduce((sum, row) => sum + row[i], 0))
  const percent = (row) => `${((row[4] / row[5]) * 100).toFixed(1)}%`
  const rows = [
    headings,
    ...state.rows.map((row) => [...row, percent(row)]),
    ['Total', ...sums, percent([0, ...sums])],
  ]
  return (
    <section key={key} class={s.root} tabindex={-1} oncreate={cover} ondestroy={uncover}>
      <header class={s.header}>
        <div class={s.title}>Q3 budget</div>
        <nav class={s.menus}>
          {['File', 'Edit', 'View', 'Insert', 'Format', 'Data', 'Tools', 'Help'].map((name) => (
            <span>{name}</span>
          ))}
        </nav>
      </header>
      <div class={s.formula}>
        <span class={s.ref}>E{rows.length}</span>
        <span class={s.fx}>fx</span>
        <span>=SUM(E2:E{rows.length - 1})</span>
      </div>
      <div class={s.grid}>
        <table class={s.table}>
          <thead>
            <tr>
              <th class={s.corner} />
              {columns.map((c) => (
                <th>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 60 }, (_, i) => (
              <Row number={i + 1} cells={rows[i]} total={i === rows.length - 1} />
            ))}
          </tbody>
        </table>
      </div>
      <footer class={s.footer}>
        <div class={s.tabs}>
          <span class={s.tab}>Summary</span>
          <span class={s.tabActive}>Departments</span>
          <span class={s.tab}>Assumptions</span>
        </div>
        <div class={s.status}>
          <span>Ready</span>
          <span>Sum: {money(sums[3])}</span>
          {/*the zoom level is the way back on touch screens*/}
          <button type="button" class={s.exit} onclick={() => actions.boss()}>
            100%
          </button>
        </div>
      </footer>
    </section>
  )
}

//floating button for the same thing, drawn in the theme
export const BossButton = ({ key, actions }) => (
  <div key={key} class={s.button}>
    <Button tabIndex={-1} title="Boss key (Esc)" onClick={() => actions.boss()}>
      <span class={s.label}>Esc</span>
    </Button>
  </div>
)

export default Boss
