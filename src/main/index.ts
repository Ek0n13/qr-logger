import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'

let mainWindow: BrowserWindow | null = null

type UpdateStatus = {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  message: string
  version?: string
  percent?: number
}

function sendUpdateStatus(status: UpdateStatus): void {
  mainWindow?.webContents.send('updates:status', status)
}

function configureUpdates(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({ status: 'checking', message: 'Checking for updates...' })
  })

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({
      status: 'available',
      message: `Version ${info.version} is available.`,
      version: info.version
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    sendUpdateStatus({
      status: 'not-available',
      message: `You are on the latest version (${info.version}).`,
      version: info.version
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({
      status: 'downloading',
      message: `Downloading update ${Math.round(progress.percent)}%...`,
      percent: progress.percent
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({
      status: 'downloaded',
      message: `Version ${info.version} is ready to install.`,
      version: info.version
    })
  })

  autoUpdater.on('error', (error) => {
    sendUpdateStatus({ status: 'error', message: error.message })
  })

  ipcMain.handle('updates:check', async () => {
    if (!app.isPackaged) {
      const status: UpdateStatus = {
        status: 'not-available',
        message: 'Update checks run from packaged builds.'
      }

      sendUpdateStatus(status)
      return status
    }

    await autoUpdater.checkForUpdates()
    return { status: 'checking', message: 'Checking for updates...' } satisfies UpdateStatus
  })

  ipcMain.handle('updates:download', async () => {
    await autoUpdater.downloadUpdate()
    return { status: 'downloading', message: 'Downloading update...' } satisfies UpdateStatus
  })

  ipcMain.handle('updates:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })
}

function createWindow(): void {
  // Create the browser window.
  const window = new BrowserWindow({
    width: 1024,
    height: 576,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow = window

  window.on('ready-to-show', () => {
    window.show()
  })

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.ek0n13.qrlogger')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  configureUpdates()
  createWindow()

  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((error) => {
        sendUpdateStatus({ status: 'error', message: error.message })
      })
    }, 3000)
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
