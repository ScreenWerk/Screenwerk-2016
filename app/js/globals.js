const path = require('path')
const fs = require('fs')
const YAML = require('yamljs')

// Initialise globals, sanity check filesystem
module.exports = (screenEid) => {
  let _G = {} // Globals. Paths, screenEid, etc.

  _G.SCREEN_EID = screenEid
  _G.packageJson = require(path.resolve(__dirname, '..', '..', 'package.json'))

  _G.codes = {
    CONFIGURATION_DOWNLOAD_IN_PROGRESS: 'CONFIGURATION_DOWNLOAD_IN_PROGRESS',
    CONFIGURATION_FILE_NOT_PRESENT: 'CONFIGURATION_FILE_NOT_PRESENT',
    CONFIGURATION_NOT_AVAILABLE_YET: 'CONFIGURATION_NOT_AVAILABLE_YET',
    CONFIGURATION_FILE_OK: 'CONFIGURATION_FILE_OK',
    CONFIGURATION_FETCH_FAILED: 'CONFIGURATION_FETCH_FAILED',
    CONFIGURATION_NOT_UPDATED: 'CONFIGURATION_NOT_UPDATED',
    CONFIGURATION_UPDATED: 'CONFIGURATION_UPDATED',
    DOM_RENDERED: 'DOM_RENDERED',
    MEDIA_TYPE_URL: 'URL',
    MEDIA_TYPE_IMAGE: 'Image',
    MEDIA_TYPE_VIDEO: 'Video',
    MEDIA_TYPE_AUDIO: 'Audio'
  }
  _G.HOME_PATH = path.resolve(__dirname, '..', '..', 'local')
  if (!fs.existsSync(_G.HOME_PATH)) {
    fs.mkdirSync(_G.HOME_PATH)
  }

  _G.META_DIR = path.resolve(_G.HOME_PATH)
  // _G.META_DIR = path.resolve(_G.HOME_PATH, 'sw-meta')
  if (!fs.existsSync(_G.META_DIR)) {
    fs.mkdirSync(_G.META_DIR)
  }
  fs.readdirSync(_G.META_DIR).forEach((downloadFilename) => {
    if (downloadFilename.split('.').pop() !== 'download') { return }
    let downloadFilePath = path.resolve(_G.META_DIR, downloadFilename)
    console.log('Unlink ' + downloadFilePath)
    let result = fs.unlinkSync(downloadFilePath)
    if (result instanceof Error) {
      console.log("Can't unlink " + downloadFilePath, result)
    }
  })

  _G.MEDIA_DIR = path.resolve(_G.HOME_PATH, 'sw-media')
  if (!fs.existsSync(_G.MEDIA_DIR)) {
    fs.mkdirSync(_G.MEDIA_DIR)
  }
  fs.readdirSync(_G.MEDIA_DIR).forEach((downloadFilename) => {
    if (downloadFilename.split('.').pop() !== 'download') { return }
    let downloadFilePath = path.resolve(_G.MEDIA_DIR, downloadFilename)
    console.log('Unlink ' + downloadFilePath)
    let result = fs.unlinkSync(downloadFilePath)
    if (result instanceof Error) {
      console.log("Can't unlink " + downloadFilePath, result)
    }
  })

  let closeWithMessage = (message) => {
    window.alert(message)
    const {shell} = require('electron')
    shell.showItemInFolder(_G.credentialsFilePath)
    throw new Error(message)
    window.close()
  }

  _G.credentialsFilePath = path.resolve(_G.HOME_PATH, 'screen.yml')
  try {
    fs.accessSync(_G.credentialsFilePath, fs.R_OK)
  }
  catch (e) {
    fs.writeFileSync(_G.credentialsFilePath, YAML.stringify({
      SCREEN_EID: 0,
      SCREEN_KEY: '',
      DISPLAY_NUM: 2,
      SKIP_TASKBAR: true,
      DEV_MODE: false
    }))
    closeWithMessage('Please fill in mandatory SCREEN_EID in configuration file "' + _G.credentialsFilePath + '"')
  }

  try {
    fs.accessSync(_G.credentialsFilePath, fs.R_OK)
  }
  catch (e) {
    closeWithMessage('Credentials file not accessible!')
  }

  try {
    let data = fs.readFileSync(_G.credentialsFilePath, 'utf8')
    let credentials = YAML.parse(data)
    _G.SCREEN_EID = credentials.SCREEN_EID
    _G.SCREEN_KEY = credentials.SCREEN_KEY
    _G.DISPLAY_NUM = credentials.DISPLAY_NUM
    _G.DEV_MODE = credentials.DEV_MODE
  }
  catch (e) {
    closeWithMessage('Credentials file corrupted!')
  }

  if (!_G.SCREEN_EID) {
    closeWithMessage('Please fill in mandatory SCREEN_EID in configuration file "' + _G.credentialsFilePath + '"')
  }

  _G.tempConfFilePath = path.resolve(_G.META_DIR, _G.SCREEN_EID + '.json.download')
  _G.confFilePath = path.resolve(_G.META_DIR, _G.SCREEN_EID + '.json')
  _G.SCREENWERK_API = 'https://swpublisher.entu.eu/configuration/' + _G.SCREEN_EID

  return _G
}
