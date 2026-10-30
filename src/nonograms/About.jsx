import { h } from 'hyperapp'
import About, { Link } from '../shell/About'

const NonogramsAbout = ({ key, actions }) => (
  <About key={key} name="Nonograms Plus" actions={actions}>
    <p>
      Picture logic puzzles: the numbers beside each row and above each column give the lengths of
      its runs of filled cells, in order, with at least one empty cell between runs. Fill the cells
      that match every clue.
    </p>
    <p>
      Every board has exactly one solution and can be solved by logic alone. Nonograms were devised
      in 1987 by Non Ishida and, independently, Tetsuya Nishio.
    </p>
    <p>
      Part of Puzzles Plus by fexofenadine, sharing its window, themes and backgrounds with
      Minesweeper Plus, which is based on{' '}
      <Link href="https://github.com/frenzzy/minesweeper">Minesweeper</Link> by Vladimir Kutepov.
    </p>
  </About>
)

export default NonogramsAbout
