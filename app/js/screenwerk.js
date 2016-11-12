// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const path = require('path')
const fs = require('fs')

console.log('Starting screenwerk.js')
require(path.resolve(__dirname, 'globals.js'))( (err, _G) => {  // Globals. Paths, screenEid, etc.
  console.log('Globals loaded')
  const sync = require(path.resolve(__dirname, 'sync.js'))

  const readConfiguration = (_G, callback) => {
    fs.readFile(_G.confFilePath, (err, configuration) => {
      if (!err) { // Metafile is present, media should be up to date
        return callback(_G.codes.CONFIGURATION_FILE_OK, JSON.parse(configuration))
      }

      // Metafile not present for screen
      setTimeout(() => { readConfiguration(_G, callback) }, 1e3)

      fs.access(_G.tempConfFilePath, fs.F_OK, (err) => {
        if (!err) { // Metafile download in progress
          return callback(_G.codes.CONFIGURATION_DOWNLOAD_IN_PROGRESS)
        }
        sync.fetchConfiguration(_G, (err, code) => {
          if (err) {
            _G.playbackLog.log('sync.fetchConfiguration errored')
          }
          // console.log('fetchConfiguration returned with', code)
          return callback(code)
        })
        return callback(_G.codes.CONFIGURATION_FILE_NOT_PRESENT)
      })
    })
  }

  readConfiguration(_G, (code, jsonData) => {
    _G.playbackLog.log(code)
    if (code === _G.codes.CONFIGURATION_FILE_OK) {
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
      }, 10e3)
    })
  }
})
