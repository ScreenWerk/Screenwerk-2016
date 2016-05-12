const path = require('path')
const fs = require('fs')

// Initialise globals, sanity check filesystem
module.exports = (screenEid) => {
  let _G = {} // Globals. Paths, screenEid, etc.

  _G.SCREEN_EID = screenEid
  _G.packageJson = require(path.resolve(__dirname, '..', '..', 'package.json'))

  _G.codes = {
    CONFIGURATION_DOWNLOAD_IN_PROGRESS: 1,
    CONFIGURATION_NOT_PRESENT: 2,
    CONFIGURATION_FILE_OK: 4
  }

  _G.screenwerkApi = 'http://localhost:3000/configuration/' + _G.SCREEN_EID

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

  _G.tempConfFilePath = path.resolve(_G.META_DIR, _G.SCREEN_EID + '.json.download')
  _G.confFilePath = path.resolve(_G.META_DIR, _G.SCREEN_EID + '.json')

  return _G
}
