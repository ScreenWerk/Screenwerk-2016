// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const path = require('path')
const fs = require('fs')
const util = require('util')

console.log('Starting screenwerk.js')
require(path.resolve(__dirname, 'globals.js'))( (err, _G) => {  // Globals. Paths, screenEid, etc.
  console.log('Globals loaded')
  const sync = require(path.resolve(__dirname, 'sync.js'))

  // Gets executed only on program start.
  // Reinvokes itself until CONFIGURATION_FILE_OK
  const readConfiguration = (_G, callback) => {
    fs.readFile(_G.confFilePath, (err, configuration) => {
      if (!err) { // Metafile is present, media should be up to date
        try {
          let _configuration = JSON.parse(configuration)
          return callback(_G.codes.CONFIGURATION_FILE_OK, _configuration)
        } catch (e) {
          _G.playbackLog.log(e)
          fs.unlinkSync(_G.confFilePath)
        }
      }

      // Metafile not present for screen

      fs.access(_G.tempConfFilePath, fs.F_OK, (err) => {
        if (!err) { // Metafile download in progress
          setTimeout(() => { readConfiguration(_G, callback) }, 1e3) // retry in a sec
          return callback(_G.codes.CONFIGURATION_DOWNLOAD_IN_PROGRESS)
        }
        sync.fetchConfiguration(_G, (error, code) => {
          if (error) {
            _G.playbackLog.log(error.toJSON().statusCode)
            setTimeout(() => { readConfiguration(_G, callback) }, 30e3) // retry in 30sec
            return callback(error.toJSON().statusCode)
          }
          // Got positive result from fetchConfiguration
          return callback(code)
        })
        return callback(_G.codes.CONFIGURATION_FILE_NOT_PRESENT)
      })
    })
  }

  let IS_CONFIGURATION_FILE_OK = false
  readConfiguration(_G, (code, jsonData) => {
    if (IS_CONFIGURATION_FILE_OK) {
      _G.playbackLog('Callback allready called', '[WARNING]')
      return
    }
    _G.playbackLog.log(code)
    if (code === _G.codes.CONFIGURATION_FILE_OK || code === _G.codes.CONFIGURATION_NOT_UPDATED || code === _G.codes.CONFIGURATION_UPDATED) {
      IS_CONFIGURATION_FILE_OK = true
      _G.playbackLog.log('CONFIGURATION_FILE_OK. Start playback')
      playConfiguration(_G, jsonData)
      pollUpdates(_G)
      return
    }
    return
  })


  function playConfiguration (_G, configuration) {
    document.getElementById('lastUpdatedAt').innerHTML = new Date(configuration.publishedAt).toString()
    let screen_id = ['SG' + configuration['screenGroupEid'], 'CNF' + configuration['configurationEid'], 'SCR' + configuration['screenEid']].join('.')
    _G.playbackLog.log('Lets play', screen_id + ' @ ' + configuration['publishedAt'])
    _G.playbackLog.log('<=- Structure of ID\'s', 'shedule.layout.playlist.media')
    require(path.resolve(__dirname, 'renderDom.js')).render(_G, configuration, (err, code) => {
      if (err) { _G.playbackLog.log('renderer errored') }
      _G.playbackLog.log('renderer returned with code: ' + code)
    })
  }

  function pollUpdates (_G) {
    _G.playbackLog.log('start polling')
    sync.fetchConfiguration(_G, (err, code) => {
      if (err) { _G.playbackLog.log('poll errored') }
      _G.playbackLog.log('fetchConfiguration returned with: ' + code)
      if (code === _G.codes.CONFIGURATION_UPDATED) {
        fs.readFile(_G.confFilePath, (err, configuration) => {
          if (err) { _G.playbackLog.log('read conf errored') }
          playConfiguration(_G, JSON.parse(configuration))
        })
      }
      // console.log('poll finished')
      setTimeout(function () {
        pollUpdates(_G)
      }, 30e3)
    })
  }
})
