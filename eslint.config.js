import js from '@eslint/js'
import globals from 'globals'

export default [
  { ignores: ['build/', 'coverage/', 'public/'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    rules: {
      //h is the jsx pragma
      'no-unused-vars': ['error', { varsIgnorePattern: '^h$' }],
    },
  },
  {
    files: ['vite.config.js', 'eslint.config.js', 'prettier.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
]
