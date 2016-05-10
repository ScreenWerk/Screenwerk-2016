// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const path = require('path')

// var packageJson = require('../../package.json')
// document.write(JSON.stringify(packageJson, null, 4))

const screenEid = 6534

const sync = require(path.resolve(__dirname, 'sync.js'))
sync(screenEid, (err) => {
  if (err) {
    console.log(err)
    return
  }
  console.log('Synced')
})
