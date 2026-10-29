import { app } from 'hyperapp'
import { state, actions, view } from './app'
import { startBackgrounds } from '../shell/backgrounds'
import { registerWorker } from '../shell/worker'

app(state, actions, view, document.getElementById('app'))
startBackgrounds()

registerWorker()
