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

  _G.HOME_PATH = path.resolve(
    process.env.HOME
      ? process.env.HOME
      : process.env.HOMEDRIVE + process.env.HOMEPATH, _G.packageJson.name)
  if (!fs.existsSync(_G.HOME_PATH)) {
    fs.mkdirSync(_G.HOME_PATH)
  }

  _G.META_DIR = path.resolve(_G.HOME_PATH, 'sw-meta')
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

  _G.credentialsFilePath = path.resolve(_G.HOME_PATH, 'screen.yml')
  if (process.env.SCREEN_EID && process.env.SCREEN_KEY) {
    _G.SCREEN_EID = process.env.SCREEN_EID
    _G.SCREEN_KEY = process.env.SCREEN_KEY
    let credentials = YAML.stringify({ SCREEN_EID: _G.SCREEN_EID, SCREEN_KEY: _G.SCREEN_KEY }, 4)
    fs.writeFileSync(_G.credentialsFilePath, credentials)
  }

  try {
    fs.accessSync(_G.credentialsFilePath, fs.R_OK)
  }
  catch (e) {
    throw (e)
    // throw new Error('Credentials file not accessible!')
  }

  try {
    let data = fs.readFileSync(_G.credentialsFilePath, 'utf8')
    console.log(data)
    let credentials = YAML.parse(data)
    console.log(credentials)
    _G.SCREEN_EID = credentials.SCREEN_EID
    _G.SCREEN_KEY = credentials.SCREEN_KEY
  }
  catch (e) {
    throw new Error('Credentials file corrupted!')
  }
  _G.tempConfFilePath = path.resolve(_G.META_DIR, _G.SCREEN_EID + '.json.download')
  _G.confFilePath = path.resolve(_G.META_DIR, _G.SCREEN_EID + '.json')
  _G.SCREENWERK_API = 'https://swpublisher.entu.eu/configuration/' + _G.SCREEN_EID

  return _G
}
