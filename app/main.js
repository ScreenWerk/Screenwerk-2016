const path = require('path')
const fs = require('fs')
const YAML = require('yamljs')
const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

let displayNum = 1
let devMode = false
function createWindow () {

  let confFilePath = path.resolve('__dirname', '..', 'local', 'screen.yml')
  try {
    let data = fs.readFileSync(confFilePath, 'utf8')
    let conf = YAML.parse(data)
    displayNum = conf.DISPLAY_NUM
    devMode = conf.DEV_MODE
    console.log(conf)
  }
  catch (e) {
    console.log('Cant read from configuration file from ' + confFilePath + '. Not a problem (yet).', e)
  }

  // Create the browser window.
  let electronScreen = electron.screen
  let displays = electronScreen.getAllDisplays()
  if (displays.length < displayNum) {
    displayNum = 1
  }
  // displayNum should be either 0 (main screen) or the number set in configuration minus one.
  displayNum --
  let display = displays[displayNum]

  console.log(displays)

  mainWindow = new BrowserWindow({ x: display.bounds.x, y: display.bounds.y, width: 900, height: 600 })
  mainWindow.setKiosk(true)
  mainWindow.setMenu(null)
  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/index.html')

  // Open the DevTools.
  if (devMode === true) {
    mainWindow.webContents.openDevTools()
  }

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
    app.quit()
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
