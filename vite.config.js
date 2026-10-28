import { createHash } from 'node:crypto'
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
      },
      output: {
        entryFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  plugins: [versionAssets()],
  test: {
    environment: 'jsdom',
  },
})
