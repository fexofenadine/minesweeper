import { h } from 'hyperapp'
import HowToPlay from '../shell/HowToPlay'

const TakuzuHowToPlay = ({ key, actions }) => (
  <HowToPlay key={key} name="Takuzu" actions={actions}>
    <p>
      Fill every cell with 0 or 1 so that no row or column has three of the same digit next to each
      other, every row and column holds as many 0s as 1s, and no two rows or two columns are the
      same.
    </p>
    <p>
      Click a cell to step it through 0, 1 and empty, right click to step back. The framed cells are
      clues and stay as they are. Ctrl+Z undoes, and the left counter shows the cells still empty.
    </p>
    <p>
      Show Errors marks broken rules as you play, and Hint explains the next step logic gives. Every
      board has one solution that needs no guessing.
    </p>
  </HowToPlay>
)

export default TakuzuHowToPlay
