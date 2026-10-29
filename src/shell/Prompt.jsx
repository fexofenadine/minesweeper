import { h } from 'hyperapp'
import s from './Prompt.module.css'
import Overlay from '../Overlay'
import Dialog from '../Dialog'
import Button from '../Button'

//a finished board that isn't solved, a hint or fix it alone
const Prompt = ({ key, title, text, actions }) => (
  <Overlay key={key} onKeyDown={(event) => event.keyCode === 27 && actions.answerPrompt(false)}>
    <Dialog title={title} onClose={() => actions.answerPrompt(false)}>
      <div class={s.root}>
        <p class={s.text}>{text}</p>
        <div class={s.footer}>
          <Button type="button" onClick={() => actions.answerPrompt(true)}>
            <span class={s.button}>Yes</span>
          </Button>
          <Button
            type="button"
            onClick={() => actions.answerPrompt(false)}
            onCreate={(el) => el.focus()}
          >
            <span class={s.button}>No</span>
          </Button>
        </div>
      </div>
    </Dialog>
  </Overlay>
)

export default Prompt
