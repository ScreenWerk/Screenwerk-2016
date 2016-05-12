// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const path = require('path')
const fs = require('fs')

let _G = require(path.resolve(__dirname, 'globals.js'))(6534) // Globals. Paths, screenEid, etc.

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
      sync.fetchConfiguration(_G, (err) => {
        if (err) { console.log(err) }
      })
      return callback(_G.codes.CONFIGURATION_NOT_PRESENT)
    })
  })
}

readConfiguration(_G, (code, jsonData) => {
  if (code === _G.codes.CONFIGURATION_FILE_OK) {
    console.log('CONFIGURATION_FILE_OK')
    playConfiguration(_G, jsonData)
    pollUpdates(_G)
    return
  }
  if (code === _G.codes.CONFIGURATION_DOWNLOAD_IN_PROGRESS) {
    return console.log('CONFIGURATION_DOWNLOAD_IN_PROGRESS')
  }
  if (code === _G.codes.CONFIGURATION_NOT_PRESENT) {
    return console.log('CONFIGURATION_NOT_PRESENT')
  }
})

function playConfiguration (_G, configuration) {
  console.log('Lets play it!!!')
}

function pollUpdates (_G) {

}
// const doSync = (syncCallback) => {
//   fs.access(_G.confFilePath, fs.F_OK, (err) => {
//     if (err) { // Metafile not present for screen
//       fs.access(_G.tempConfFilePath, fs.F_OK, (err) => {
//         if (err) { // Metafile not downloading either.
//           syncCallback(null, null, null) // Execute download immediately
//         } else { // Media downloading in progress
//           let message = 'Media downloading in progress'
//           console.log(message)
//           syncCallback(null, message, 60e3) // Try download again in a minute
//         }
//       })
//     } else { // Metafile is present, media should be up to date
//       let message = 'Metafile is present, media should be up to date'
//       console.log(message)
//       syncCallback(message)
//     }
//   })
//   syncCallback(null)
// }
//
// doSync((err, message, timeoutMs) => {
//   if (err) {
//     return console.log(err)
//   }
//   if (message) {
//     return console.log(message)
//   }
//   setTimeout(() => {
//     sync(_G, (err) => {
//       if (err) {
//         return console.log(err)
//       }
//       console.log('Synced')
//     })
//   }, timeoutMs ? timeoutMs : 1)
// })
