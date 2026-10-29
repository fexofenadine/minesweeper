import { h } from 'hyperapp'
import HowToPlay from '../shell/HowToPlay'

const NonogramsHowToPlay = ({ key, actions }) => (
  <HowToPlay key={key} name="Nonograms" actions={actions}>
    <p>
      The numbers beside each row and above each column are the lengths of its runs of filled cells,
      in order, with at least one empty cell between runs. Fill cells until every row and column
      matches its clue; a clue dims once its line matches.
    </p>
    <p>
      Click a cell to fill it, again to cross it out and again to clear it, right click to step
      back. Crosses are notes for yourself and the win never needs them. Drag to paint along a row
      or column. On a touch screen, the button beside the face picks whether taps fill or cross.
    </p>
    <p>
      The left counter shows the cells still to fill and Ctrl+Z undoes a whole drag. Show Errors
      turns a clue red once its line can't match any more, and Hint explains the next step logic
      gives. Every board has one solution that needs no guessing.
    </p>
  </HowToPlay>
)

export default NonogramsHowToPlay
