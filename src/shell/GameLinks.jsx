import { h } from 'hyperapp'
import { SubMenuItem } from '../Menu'

const games = [
  ['minesweeper', 'Minesweeper'],
  ['takuzu', 'Takuzu'],
  ['nonograms', 'Nonograms'],
]

//every game's page for the game menu, the open one checked
export const gameLinks = (current) =>
  games.map(([id, name]) => (
    <SubMenuItem
      name={name}
      checked={id === current}
      onClick={() => id !== current && location.assign(`../${id}/`)}
    />
  ))
