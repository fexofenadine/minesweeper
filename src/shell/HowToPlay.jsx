import { h } from 'hyperapp'
import s from './About.module.css'
import Overlay from '../Overlay'
import Dialog from '../Dialog'
import Button from '../Button'

//a short rules summary in the about box's style, each game gives its own paragraphs
const HowToPlay = ({ key, name, actions }, children) => (
  <Overlay key={key} onKeyDown={(event) => event.keyCode === 27 && actions.toggleHowTo()}>
    <Dialog title={`How to Play ${name}`} onClose={actions.toggleHowTo}>
      <div class={s.wide}>
        {children}
        <p>
          Every game: F2 or N starts a new game, H gives a hint, P pauses, and Esc hides the game
          behind a spreadsheet.
        </p>
        <div class={s.footer}>
          <Button type="button" onClick={actions.toggleHowTo} onCreate={(el) => el.focus()}>
            <span class={s.button}>OK</span>
          </Button>
        </div>
      </div>
    </Dialog>
  </Overlay>
)

export default HowToPlay
