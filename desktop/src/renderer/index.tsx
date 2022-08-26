// import Bugsnag from '@bugsnag/electron'

import { createRoot } from 'react-dom/client'

import 'tailwindcss/tailwind.css'

import { library } from '@fortawesome/fontawesome-svg-core'
import { fab } from '@fortawesome/free-brands-svg-icons'
import { fas } from '@fortawesome/free-solid-svg-icons'
// import {
//     faCheckSquare,
//     faCoffee
// } from '@fortawesome/free-solid-svg-icons'

import App from './App'

// Bugsnag.start({ apiKey: '6a614b8e3b8bb1c0ed6092eef4b6c305' })

library.add(fab, fas)
// library.add(fab, faCheckSquare, faCoffee)

const container = document.getElementById('root')!

const root = createRoot(container)

root.render(<App />)

// calling IPC exposed from preload script
window.electron.ipcRenderer.once('ipc-example', (arg) => {
    // eslint-disable-next-line no-console
    console.log(arg)
})

window.electron.ipcRenderer.sendMessage('ipc-example', ['ping'])
