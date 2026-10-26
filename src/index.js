import { app } from 'hyperapp'
import { state, actions, view } from './app'
import { startBackgrounds } from './backgrounds'

app(state, actions, view, document.getElementById('app'))
startBackgrounds()

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  //refused when storage is blocked, which is fine
  navigator.serviceWorker.register('service-worker.js').catch(() => {})
}
