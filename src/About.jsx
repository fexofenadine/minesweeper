import { h } from 'hyperapp'
import About, { Link } from './shell/About'

const MinesweeperAbout = ({ key, actions }) => (
  <About key={key} name="Minesweeper Plus" actions={actions}>
    <p>
      A Windows style minesweeper with boards that never need a guess, hints that explain their
      reasoning, zoom, and animated themes ported from xscreensaver.
    </p>
    <p>
      Based on <Link href="https://github.com/frenzzy/minesweeper">Minesweeper</Link> by Vladimir
      Kutepov, extended by fexofenadine.
    </p>
  </About>
)

export default MinesweeperAbout
