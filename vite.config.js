import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { defineConfig } from 'vite'

//?v=<hash> on asset links so old and new files never mix
const versionAssets = () => ({
  name: 'version-assets',
  transformIndexHtml: {
    order: 'post',
    handler: (html, { bundle }) =>
      html.replace(/((?:\.\.\/)+|\.\/)(assets\/[^"?]+)"/g, (match, path, file) => {
        const output = bundle?.[file]
        if (!output) return match
        const hash = createHash('sha256')
          .update(output.code ?? output.source)
          .digest('hex')
          .slice(0, 8)
        return `${path}${file}?v=${hash}"`
      }),
  },
})

//both games share one pre-paint script, inlined so it runs before the page draws
const prepaint = () => ({
  name: 'prepaint',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) =>
      html.replace(
        '<!--prepaint-->',
        `<script>${readFileSync('src/shell/prepaint.js', 'utf8')}</script>`,
      ),
  },
})

export default defineConfig({
  base: './',
  oxc: {
    jsx: { runtime: 'classic', pragma: 'h' },
  },
  css: {
    modules: {
      //readable class names like Cell_root
      generateScopedName: (name, file) => `${basename(file).split('.')[0]}_${name}`,
    },
  },
  build: {
    outDir: 'build',
    minify: false,
    cssMinify: false,
    modulePreload: { polyfill: false },
    rolldownOptions: {
      //the root page only redirects, each game is its own page
      input: {
        index: 'index.html',
        minesweeper: 'minesweeper/index.html',
        takuzu: 'takuzu/index.html',
        nonograms: 'nonograms/index.html',
      },
      output: {
        entryFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  plugins: [prepaint(), versionAssets()],
  test: {
    environment: 'jsdom',
  },
})
