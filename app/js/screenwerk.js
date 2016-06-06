// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const path = require('path')
const fs = require('fs')

let _G = require(path.resolve(__dirname, 'globals.js'))() // Globals. Paths, screenEid, etc.

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
          console.log(err)
        }
        // console.log('fetchConfiguration returned with', code)
        return callback(code)
      })
      return callback(_G.codes.CONFIGURATION_FILE_NOT_PRESENT)
    })
  })
}

readConfiguration(_G, (code, jsonData) => {
  if (code === _G.codes.CONFIGURATION_FILE_OK) {
    playConfiguration(_G, jsonData)
    pollUpdates(_G)
    return console.info(code)
  }
  return console.info(code)
})

function playConfiguration (_G, configuration) {
  document.getElementById('lastUpdatedAt').innerHTML = new Date(configuration.publishedAt).toString()
  console.log('Lets play it!!!', configuration.publishedAt)
  require(path.resolve(__dirname, 'renderDom.js')).render(_G, configuration, (err, code) => {
    if (err) { console.log(err) }
    console.log('renderer returned with code: ', code)
    require(path.resolve(__dirname, 'player.js')).play(_G, configuration, (err, code) => {
      if (err) { console.log(err) }
      console.log('player returned with code: ', code)
    })
  })
}

function pollUpdates (_G) {
  // console.log('start polling')
  sync.fetchConfiguration(_G, (err, code) => {
    if (err) { console.log(err) }
    // console.log('fetchConfiguration returned with', code)
    if (code === _G.codes.CONFIGURATION_UPDATED) {
      fs.readFile(_G.confFilePath, (err, configuration) => {
        if (err) { console.log(err) }
        playConfiguration(_G, JSON.parse(configuration))
      })
    }
    // console.log('poll finished')
    setTimeout(function () {
      pollUpdates(_G)
    }, 10e3)
  })
}
