import { h } from 'hyperapp'
import About, { Link } from '../shell/About'

const TakuzuAbout = ({ key, actions }) => (
  <About key={key} name="Takuzu Plus" actions={actions}>
    <p>
      Binary puzzles: fill the grid with 0s and 1s so that no row or column has three alike in a
      row, every row and column holds as many 0s as 1s, and no two rows or two columns are the same.
    </p>
    <p>
      Every board has exactly one solution and can be solved by logic alone, from easy to expert,
      and hints explain their reasoning. Takuzu, also known as Binairo, was devised by Frank
      Coussement and Peter De Schepper.
    </p>
    <p>
      Part of Puzzles Plus by fexofenadine, sharing its window, themes and backgrounds with
      Minesweeper Plus, which is based on{' '}
      <Link href="https://github.com/frenzzy/minesweeper">Minesweeper</Link> by Vladimir Kutepov.
    </p>
  </About>
)

export default TakuzuAbout
