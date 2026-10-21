import { app } from 'hyperapp'
import { state, actions, view } from './app'
import { startRain } from './rain'

app(state, actions, view, document.getElementById('app'))
startRain()

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('service-worker.js')
}
