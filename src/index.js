import { app } from 'hyperapp'
import { state, actions, view } from './app'
import { startBackgrounds } from './backgrounds'

app(state, actions, view, document.getElementById('app'))
startBackgrounds()

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  //browsers that block site storage refuse to register, the game works without it
  navigator.serviceWorker.register('service-worker.js').catch(() => {})
}
