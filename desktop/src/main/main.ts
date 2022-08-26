/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path'
import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'

import TailingStream = require('tailing-stream')

import { spawn } from 'child_process'
import kill from 'tree-kill'

import MenuBuilder from './menu'
import { resolveHtmlPath } from './util'

/**
 * Auto Updater
 */
class AppUpdater {
    /* Constructor. */
    constructor() {
        log.transports.file.level = 'fsinfo'

        autoUpdater.logger = log

        autoUpdater.checkForUpdatesAndNotify()
    }
}

/* Initialize playground. */
const playground = {}

/**
 * Stop Script
 *
 * Terminates a running child.
 */
function stop_script(_childid, _callback) {
    console.log('STOP CHILD ID', _childid)

    if (!playground[_childid]) {
        // alert('Could not find child id', _childid)
        throw new Error(`Could not find child [ ${_childid} ]`)
    }

    /* Kill child. */
    kill(playground[_childid].pid)

    /* Remove child from playground. */
    delete playground[_childid]

    /* Handle method callback. */
    if (typeof _callback === 'function')
        _callback(`Killed [ ${_childid} ]`)
}

/**
 * Run Script
 *
 * This function will output the lines from the script
 * and will return the full combined output
 * as well as exit code when it's done (using the callback).
 */
function run_script(command, args, _callback, _childid) {
    // console.log('START CHILD ID', _childid)

    /* Initialize output handler. */
    let output

    /* Run child process. */
    // const child = spawn(command, args, {
    //     encoding: 'utf8',
    //     shell: true,
    // })

    const minerPath = '/Workspace/modenero/nexa/build/src/nexa-miner'
    const logPath = '/Workspace/modenero/nexa/build/src/nexa-miner.log'

    const child = spawn(minerPath, [''])

    // const child = require('child_process')
    //     .exec(minerPath, []);
    // use event hooks to provide a callback to execute when data are available:

    // const child = require('child_process')
    //     .execFile(minerPath, [], {
    //     // detachment and ignored stdin are the key here:
    //     detached: true,
    //     stdio: [ 'ignore', 1, 2 ]
    // });
    // and unref() somehow disentangles the child's event loop from the parent's:
    // child.unref();

    // child.stdout.on('data', function(data) {
    //     console.log(data.toString());
    // });

    console.info('Process ID:', child.pid)

    // This line opens the file as a readable stream
    // const readStream = fs.createReadStream(logPath, 'utf8');

    // readStream.on('open', function () {
    //     // This just pipes the read stream to the response object (which goes to the client)
    //     console.log('opened!')
    // });

    // readStream.on('data', function (data) {
    //     // This just pipes the read stream to the response object (which goes to the client)
    //     // readStream.pipe(console.log);
    //     console.log('DATA', data);
    //
    // });

    // This catches any errors that happen while creating the readable stream (usually invalid names)
    // readStream.on('error', function(err) {
    //     console.error(err)
    // });

    /* Initialize tailing (log) stream. */
    const logData = TailingStream
        .createReadStream(logPath, { timeout: 0 })

    /* Handle log data. */
    logData.on('data', _buf => {
        // console.log('_buf.slice(0, 2)', _buf.slice(0, 2), _buf.toString());

        if (_buf.toString().indexOf('::') !== -1)
            // console.log('LOG (tail) DATA', _buf.toString())
            console.log(_buf.toString())
    })

    /* Handle log close. */
    logData.on('close', () => {
        console.log('LOG CLOSE')
    })

    /* Add child to plaground (process manager). */
    playground[_childid] = child

    /* Handle timeout. */

    /* Handle errors. */
    // child.on('error', (error) => {
    //     console.error(error)
    // })

    /* Set output encoding. */
    // child.stdout.setEncoding('utf8')

    // child.on('message', (_msg) => {
    //     console.log('MESSAGE', _msg);
    // })

    /* Handle data. */
    // child.stdout.on('data', function (data) {
    // // child.stdout.on('data', (data) => {
    //     /* Convert the data to a string. */
    //     output = data.toString()
    //     console.log('SCRIPT OUTPUT', output)
    // })

    /* Set error encoding. */
    // child.stderr.setEncoding('utf8')

    /* Handle errors. */
    // child.stderr.on('data', function (data) {
    // // child.stderr.on('data', (data) => {
    //     // Return some data to the renderer process with the mainprocess-response ID
    //     mainWindow.webContents.send('mainprocess-response', data)
    //     console.log(data)
    // })

    /* Handle close. */
    child.on('close', (_code) => {
        switch (_code) {
            case null:
            case 0:
                console.info('End process.')
                break
            default:
                console.error('Unknown error code:', _code)
        }

        /* Handle method callback. */
        if (typeof _callback === 'function')
            _callback(output)
    })
}

let mainWindow: BrowserWindow | null = null

ipcMain.on('ipc-example', async (event, arg) => {
    const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`
    console.log(msgTemplate(arg))
    event.reply('ipc-example', msgTemplate('pong'))
})

/* Handle local node startups. */
ipcMain.on('start-mining', async (_event, _args) => {
    // console.log('\nLOCAL NODE ARGS', _args)

    /* Request (initial) command. */
    const cmd = _args.shift()
    const childid = _args.pop()
    // console.log('CMD', cmd)
    // console.log('NEW ARGS', _args)

    /* Run the command-line script. */
    run_script(cmd, _args, (_results) => {
        /* Send IPC response. */
        _event.reply('response-local-node', _results)
    }, childid)
})

if (process.env.NODE_ENV === 'production') {
    const sourceMapSupport = require('source-map-support')
    sourceMapSupport.install()
}

const isDebug =
    process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true'

if (isDebug) {
    // NOTE: Start with developer tools.
    // require('electron-debug')()
}

const installExtensions = async () => {
    const installer = require('electron-devtools-installer')
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS
    const extensions = ['REACT_DEVELOPER_TOOLS']

    return installer
        .default(
            extensions.map((name) => installer[name]),
            forceDownload
        )
        .catch(console.log)
}

const createWindow = async () => {
    if (isDebug) {
        await installExtensions()
    }

    const RESOURCES_PATH = app.isPackaged
        ? path.join(process.resourcesPath, 'assets')
        : path.join(__dirname, '../../assets')

    const getAssetPath = (...paths: string[]): string => {
        return path.join(RESOURCES_PATH, ...paths)
    }

    mainWindow = new BrowserWindow({
        show: false,
        width: 800,
        height: 540,
        icon: getAssetPath('logo.png'),
        webPreferences: {
            preload: app.isPackaged
                ? path.join(__dirname, 'preload.js')
                : path.join(__dirname, '../../.erb/dll/preload.js'),
        },
    })

    mainWindow.loadURL(resolveHtmlPath('index.html'))

    mainWindow.on('ready-to-show', () => {
        if (!mainWindow) {
            throw new Error('"mainWindow" is not defined')
        }

        if (process.env.START_MINIMIZED) {
            mainWindow.minimize()
        } else {
            mainWindow.show()
        }
    })

    mainWindow.on('closed', () => {
        mainWindow = null
    })

    const menuBuilder = new MenuBuilder(mainWindow)
    menuBuilder.buildMenu()

    // Open urls in the user's browser
    mainWindow.webContents.setWindowOpenHandler((edata) => {
        shell.openExternal(edata.url)
        return { action: 'deny' }
    })

    // Remove this if your app does not use auto updates
    // eslint-disable-next-line
    new AppUpdater()
}

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
    // Respect the OSX convention of having the application in memory even
    // after all windows have been closed
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app
    .whenReady()
    .then(() => {
        createWindow()
        app.on('activate', () => {
            // On macOS it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (mainWindow === null) createWindow()
        })
    })
    .catch(console.log)
