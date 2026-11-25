const { app, BrowserWindow, Menu, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const ICON = path.join(__dirname, '..', 'build', 'icon.png')

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1000, minHeight: 640, backgroundColor: '#0E1013', title: 'Stage Plot', ...(fs.existsSync(ICON) ? { icon: ICON } : {}),
    webPreferences: { contextIsolation: true, sandbox: true },
  })
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  // links externos abrem no navegador do sistema, nunca dentro do app
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' } })
}

Menu.setApplicationMenu(null)
app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow() }) })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
