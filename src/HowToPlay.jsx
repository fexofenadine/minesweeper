import { h } from 'hyperapp'
import HowToPlay from './shell/HowToPlay'

const MinesweeperHowToPlay = ({ key, actions }) => (
  <HowToPlay key={key} name="Minesweeper" actions={actions}>
    <p>
      Open every square that hides no mine. Click a square to open it: a number tells how many of
      the eight squares around it hide mines. Open a mine and the game is lost.
    </p>
    <p>
      Right click a square to flag it as a mine, and again for a question mark when Marks is on.
      Once a number has as many flags around it as it says, double-click it, click it with both
      buttons or Shift click it to open the rest of its neighbours. On a touch screen, tap to open
      and hold to flag.
    </p>
    <p>
      The left counter shows the mines left to flag and the right one the seconds played. No
      Guessing deals boards that logic alone can clear, and Hint explains the next safe move from
      the numbers you can see.
    </p>
  </HowToPlay>
)

export default MinesweeperHowToPlay
