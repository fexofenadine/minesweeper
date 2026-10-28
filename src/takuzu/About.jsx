import { h } from 'hyperapp'
import s from '../About.module.css'
import Overlay from '../Overlay'
import Dialog from '../Dialog'
import Button from '../Button'

const Link = ({ href }, children) => (
  <a class={s.link} href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
)

const About = ({ key, actions }) => (
  <Overlay key={key} onKeyDown={(event) => event.keyCode === 27 && actions.toggleAbout()}>
    <Dialog title="About Takuzu Plus" onClose={actions.toggleAbout}>
      <div class={s.root}>
        <p class={s.name}>Takuzu Plus</p>
        <p>
          Binary puzzles: fill the grid with 0s and 1s so that no row or column has three alike in a
          row, every row and column holds as many 0s as 1s, and no two rows or two columns are the
          same.
        </p>
        <p>
          Every board has exactly one solution and can be solved by logic alone, from easy to
          expert, and hints explain their reasoning. Takuzu, also known as Binairo, was devised by
          Frank Coussement and Peter De Schepper.
        </p>
        <p>
          Part of Puzzles by fexofenadine, sharing its window, themes and backgrounds with
          Minesweeper Plus, which is based on{' '}
          <Link href="https://github.com/frenzzy/minesweeper">Minesweeper</Link> by Vladimir
          Kutepov.
        </p>
        <p>
          Uses canvas ports of xscreensaver's GLMatrix, Substrate, Truchet and Phosphor under the
          xscreensaver licence, fonts under the SIL Open Font License and LGPL 2.1, photos from
          Unsplash and CC0 photos from Wikimedia Commons, and the SynthWave '84, Solarized and Nord
          colour schemes. Released under the MIT licence; full credits are in the README.
        </p>
        <p>
          <Link href="https://github.com/fexofenadine/puzzles">
            github.com/fexofenadine/puzzles
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
