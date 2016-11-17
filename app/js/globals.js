const path = require('path')
const util = require('util')
const fs = require('fs')
const request = require('request')
const YAML = require('yamljs')


Object.defineProperty(global, '__stack', {
  get: function() {
    var orig = Error.prepareStackTrace
    Error.prepareStackTrace = function(_, stack) {
        return stack
    }
    var err = new Error
    Error.captureStackTrace(err, arguments.callee)
    var stack = err.stack
    Error.prepareStackTrace = orig
    return stack
  }
})


// Initialise globals, sanity check filesystem
module.exports = (callback) => {
  let _G = {} // Globals. Paths, screenEid, etc.

  _G.packageJson = require(path.resolve(__dirname, '..', '..', 'package.json'))
  _G.gitBranch = fs.readFileSync(path.resolve(__dirname, '..', '..', '.git', 'HEAD'), 'utf8')

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

  _G.checkInternet = function(cb) {
    require('dns').lookup('google.com',function(err) {
      if (err && err.code == "ENOTFOUND") {
        cb(false)
      } else {
        cb(true)
      }
    })
  }

  function closeWithMessage (message) {
    window.alert(message)
    const {shell} = require('electron')
    shell.showItemInFolder(_G.credentialsFilePath)
    window.close()
    throw new Error(message)
  }

  function writeCredentials (_G) {
    let confYaml = YAML.stringify(
      {
        "SCREEN_EID": _G.SCREEN_EID,
        "SCREEN_KEY": _G.SCREEN_KEY,
        "DISPLAY_NUM": _G.DISPLAY_NUM,
        "SKIP_TASKBAR": _G.SKIP_TASKBAR,
        "DEV_MODE": _G.DEV_MODE
      }
    )
    console.log('Writing to ' + _G.credentialsFilePath + ': ' + confYaml)
    try {
      fs.writeFileSync(_G.credentialsFilePath, confYaml)
    } catch (e) {
      closeWithMessage('Credentials file not writable!')
      return {}
    }
  }

  function readCredentials (_G) {
    try {
      let data = fs.readFileSync(_G.credentialsFilePath, 'utf8')
      return YAML.parse(data)
    }
    catch (e) {
      closeWithMessage('Credentials file corrupted!')
      return {}
    }
  }

  _G.credentialsFilePath = path.resolve(_G.HOME_PATH, 'screen.yml')
  console.log('Credentials at ' + _G.credentialsFilePath)
  try {
    fs.accessSync(_G.credentialsFilePath, fs.R_OK)
  }
  catch (e) {
    _G.SCREEN_EID = 0
    _G.SCREEN_KEY = ''
    _G.DISPLAY_NUM = 2
    _G.SKIP_TASKBAR = true
    _G.DEV_MODE = false
    writeCredentials(_G)
  }

  try {
    fs.accessSync(_G.credentialsFilePath, fs.R_OK)
  }
  catch (e) {
    closeWithMessage('Credentials file not accessible!')
  }

  let credentials = readCredentials(_G)
  for (ix in credentials) {
    _G[ix] = credentials[ix]
  }
  console.log(credentials)

  let logFileName = _G.SCREEN_EID + '.playback.log'
  let prevLogFileName = _G.SCREEN_EID + '.playback(0).log'
  try {
    fs.renameSync(path.resolve(_G.HOME_PATH, logFileName), path.resolve(_G.HOME_PATH, prevLogFileName))
  } catch (e) {
    null
  }
  _G.playbackLog = fs.createWriteStream(path.resolve(_G.HOME_PATH, logFileName))
  _G.playbackLog.setDefaultEncoding('utf8')
  _G.playbackLog.log = function(text, id) {
    let when = new Date().toJSON().slice(11).replace(/[TZ]/g, ' ')
    let stack = __stack[1].toString()
    let method = stack.split(' ')[0].split('.').pop()
    let where = (
      (
        (stack.split('/').pop().split(':')[0])
        .split('.')[0]
        + ':' + stack.split('/').pop().split(':')[1]
        + new Array(15).join(' ')
      ).slice(0,15)
      + ' ' + method
      + new Array(35).join(' ')
    ).slice(0,35)

    if (typeof text === 'object') {
      text = util.inspect(text)
    }
    _G.playbackLog.write(when + where + (id ? ' [' + id + ']' : '') + ' ' + text + '\n')
  }

  _G.playbackLog.log(_G.packageJson.productName + ' version ' + _G.packageJson.version + '@' + _G.gitBranch.split(': ')[1])

  // _G.SCREEN_EID = credentials.SCREEN_EID
  // _G.SCREEN_KEY = credentials.SCREEN_KEY
  // _G.DISPLAY_NUM = credentials.DISPLAY_NUM
  // _G.DEV_MODE = credentials.DEV_MODE
  _G.SCREENWERK_API = 'https://swpublisher.entu.eu/screen/'

  _G.setScreenEid = (_G, eid) => {
    let credentials = readCredentials(_G)
    _G.SCREEN_EID = eid
    writeCredentials(_G)
  }

  if (_G.SCREEN_EID) {
    _G.tempConfFilePath = path.resolve(_G.META_DIR, _G.SCREEN_EID + '.json.download')
    _G.confFilePath = path.resolve(_G.META_DIR, _G.SCREEN_EID + '.json')
    callback(null, _G)
  }
  else {
    let screenEidDiv = document.getElementById('screenEid')
    let screenEidInput = document.getElementById('screenEidInput')
    let screenEidResult = document.getElementById('screenEidResult')

    screenEidResult.innerHTML = 'Please provide valid screen ID'
    screenEidDiv.style.display = 'block'
    screenEidInput.addEventListener('keyup', (e) => {
      if (/^\d+$/.test(screenEidInput.value)) {
        screenEidResult.innerHTML = screenEidInput.value
        if (e.keyCode === 13) {
          screenEidResult.innerHTML = 'Looking up ' + screenEidInput.value + ' ...'

          let responseData = ''
          request(_G.SCREENWERK_API + screenEidInput.value)
          .on('response', (res) => {
            if (res.statusCode !== 200) {
              screenEidResult.innerHTML = JSON.stringify({not200:res}, null, 4)
            }
          })
          .on('error', (err) => {
            screenEidResult.innerHTML = JSON.stringify({error:err}, null, 4)
            // callback(err)
          })
          .on('data', (d) => {
            responseData = responseData + d
          })
          .on('end', () => {
            let parsedData = JSON.parse(responseData)
            if (parsedData.error) {
              screenEidResult.innerHTML = JSON.stringify(parsedData.error, null, 4)
            }
            else if (parsedData.screenEid) {
              _G.SCREEN_EID = parsedData.screenEid
              _G.tempConfFilePath = path.resolve(_G.META_DIR, _G.SCREEN_EID + '.json.download')
              _G.confFilePath = path.resolve(_G.META_DIR, _G.SCREEN_EID + '.json')
              writeCredentials(_G)
              callback(null, _G)
              screenEidDiv.style.display = 'none'
            }
          })
        }
      }
      else if (screenEidInput.value.length > 0) {
        screenEidResult.innerHTML = 'Digits only, please.'
      }
      else {
        screenEidResult.innerHTML = 'Please provide valid screen ID'
      }
    })
    screenEidInput.focus()
  }
}
