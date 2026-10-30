import { h } from 'hyperapp'
import s from './About.module.css'
import Overlay from '../Overlay'
import Dialog from '../Dialog'
import Button from '../Button'

export const Link = ({ href }, children) => (
  <a class={s.link} href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
)

//the about box every game shares: its own paragraphs, then the shared credits and repository link
const About = ({ key, name, actions }, children) => (
  <Overlay key={key} onKeyDown={(event) => event.keyCode === 27 && actions.toggleAbout()}>
    <Dialog title={`About ${name}`} onClose={actions.toggleAbout}>
      <div class={s.root}>
        <p class={s.name}>{name}</p>
        {children}
        <p>
          Uses canvas ports of xscreensaver's GLMatrix, Substrate, Truchet and Phosphor under the
          xscreensaver licence, fonts under the SIL Open Font License and LGPL 2.1, photos from
          Unsplash and CC0 photos from Wikimedia Commons, and the SynthWave '84, Solarized and Nord
          colour schemes. Released under the MIT licence; full credits are in the README.
        </p>
        <p>
          <Link href="https://github.com/fexofenadine/puzzlesplus">
            github.com/fexofenadine/puzzlesplus
          </Link>
        </p>
        <div class={s.footer}>
          <Button type="button" onClick={actions.toggleAbout} onCreate={(el) => el.focus()}>
            <span class={s.button}>OK</span>
          </Button>
        </div>
      </div>
    </Dialog>
  </Overlay>
)

export default About
