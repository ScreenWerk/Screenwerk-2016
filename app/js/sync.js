const async = require('async')
const path = require('path')
const request = require('request')
const fs = require('fs')
const util = require('util')

module.exports.fetchConfiguration = (_G, callback) => {
  _G.playbackLog.log('= = = ENTER fetchConfiguration')
  if (document.getElementById('downloads') === null) {
    let downloadDiv = document.createElement('div')
    downloadDiv.id = 'downloads'
    document.body.appendChild(downloadDiv)
  } else {
    document.getElementById('downloads').style.visibility = 'hidden'
  }

  fs.readFile(_G.confFilePath, (err, configuration) => {
    _G.configurationTs = (
      err ? 0 : (new Date(JSON.parse(configuration).publishedAt)).getTime()
    )

    let conf_url = _G.SCREENWERK_API + _G.SCREEN_EID + '.json'
    _G.playbackLog.log('Requesting ' + conf_url)
    console.log(_G.packageJson.productName + ' ' + _G.packageJson.version + '@' + _G.gitBranch)
    let options = {
      headers: { 'User-Agent': _G.packageJson.productName + ' ' + _G.packageJson.version + '@' + _G.gitBranch },
      uri: conf_url
    }
    request(options, function(error, response, data) {

      if (error) {
        console.error('err', error)
        _G.playbackLog.log('Error', error.code)
        fs.unlink(_G.tempConfFilePath, () => {
          callback(error)
        })
        return
      }

      if (response === undefined) {
        console.error('Missing response')
        _G.playbackLog.log('Missing response')
        fs.unlink(_G.tempConfFilePath, () => {
          callback(null)
        })
        return
      }

      _G.playbackLog.log('Response code for ' + conf_url, response.statusCode)

      if (response.statusCode !== 200) {
        console.error('code', response.statusCode)
        _G.playbackLog.log(' Response !200', response.statusCode)
        fs.unlink(_G.tempConfFilePath, () => {
          callback(response)
        })
        return
      }

      let configuration = JSON.parse(data)
      let configurationTs = new Date(configuration.publishedAt).getTime()
      if (configurationTs === _G.configurationTs) {
        fs.unlink(_G.tempConfFilePath, () => {
          _G.playbackLog.log('CONFIGURATION_NOT_UPDATED')
          callback(null, _G.codes.CONFIGURATION_NOT_UPDATED, configuration)
        })
        return
      }

      _G.playbackLog.log('Got updates. Set _G.configurationTs: ' + _G.configurationTs + ' <- ' + configurationTs)
      _G.configurationTs = configurationTs

      loadMedias(_G, configuration, () => {
        fs.writeFileSync(_G.confFilePath, JSON.stringify(configuration, null, 2))
        fs.unlink(_G.tempConfFilePath, () => {
          async.whilst(
            () => { return document.getElementById('downloads').hasChildNodes() },
            (whilst_callback) => {
              setTimeout(function () {
                if (document.getElementById('downloads').childNodes.length) {
                  document.getElementById('downloads').removeChild(document.getElementById('downloads').lastChild)
                }
                whilst_callback(null)
              }, 100)
            },
            (error) => {
              if (error) {
                _G.playbackLog.log(error)
                return callback(error)
              }
              _G.playbackLog.log('CONFIGURATION_UPDATED')
              return callback(null, _G.codes.CONFIGURATION_UPDATED, configuration)
            }
          )
        })
      })
    })
    .pipe(fs.createWriteStream(_G.tempConfFilePath))
  })
}

const loadMedias = (_G, configuration, loadMediasCB) => {
  _G.playbackLog.log('Entering', 'loadMedias')
  var bytesToSize = (bytes) => {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0'
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10)
    var decimals = Math.max(0, i - 1)
    return (bytes / Math.pow(1024, i)).toFixed(decimals) + ' ' + sizes[i]
  }

  const cleanup_hack = () => {
    fs.readdirSync(_G.MEDIA_DIR).forEach((mediaFilename) => {
      var mfpath = path.join(_G.MEDIA_DIR, mediaFilename)
      if (fs.statSync(mfpath).size < 2000) {
        _G.playbackLog.log('Dropping too small file ' + mfpath, fs.statSync(mfpath).size)
        fs.unlink(mfpath, err => {
          if (err) throw err
        })
      }
    })
  }
  cleanup_hack()

  const queueConcurrency = 4
  var mediasToLoad = async.queue((task, taskCallback) => {
    let fileSize = 0
    let downloadedSize = 0
    let progressBar = document.getElementById(task.eid + '_progress')
    let chunkCount = 0
    progressBar.style.width = '0%'
    progressBar.style['background-color'] = 'lightgray'
    progressBar.style.height = '2px'
    fs.access(task.tempFilePath, fs.F_OK, (err) => {
      if (err) {
        fs.access(task.filePath, fs.F_OK, (err) => {
          if (err) {
            request(task.url)
              .on('response', (res) => {
                _G.playbackLog.log('Response code for task ' + task.eid, res.statusCode)
                _G.playbackLog.log('Expected size for task ' + task.eid, res.headers['content-length'])
                fileSize = Number(res.headers['content-length'])
                var textNode = document.createTextNode('; ' + bytesToSize(fileSize) + ' to download.')
                document.getElementById(task.eid).appendChild(textNode)
                document.getElementById(task.eid).appendChild(progressBar)
              })
              .on('error', (err) => {
                // _G.playbackLog.log(err.code, task.eid)
                progressBar.style.height = '2px'
              })
              .on('data', (d) => {
                chunkCount ++
                downloadedSize = downloadedSize + d.length
                if (chunkCount%20 === 1) {
                  progressBar.style.width = (downloadedSize / fileSize * 100) + '%'
                }
                // if (new Date().getTime()%5500 === 42) { request.emit('error', 'test') }
              })
              .on('end', () => {
                let color = (String(downloadedSize) === String(fileSize) ? 'green' : 'red')
                // _G.playbackLog.log('end with ' + color, task.eid)
                progressBar.style['background-color'] = color
                progressBar.style.height = '2px'
                if (color === 'green') {
                  progressBar.style.width = '100%'
                  fs.rename(task.tempFilePath, task.filePath, () => {
                    taskCallback(null)
                  })
                } else {
                  fs.unlink(task.tempFilePath, () => {
                    _G.playbackLog.log(util.inspect(downloadedSize) + ' !== ' + util.inspect(fileSize), task.eid)
                    taskCallback('download failed', task.eid)
                  })
                }
              })
              .pipe(fs.createWriteStream(task.tempFilePath))

            return
          }
          progressBar.style['background-color'] = 'green'
          // progressBar.style.height = '20px'
          progressBar.style.width = '100%'
          document.getElementById(task.eid).appendChild(document.createTextNode('; file exists: ' + task.filePath))
          taskCallback(null)
        })

        return
      }
      document.getElementById(task.eid).appendChild(document.createTextNode('; file already downloading: ' + task.tempFilePath))
      taskCallback(null)
    })
  }, queueConcurrency)

  mediasToLoad.drain = () => {
    document.getElementById('downloads').appendChild(document.createElement('hr'))
    document.getElementById('downloads').appendChild(document.createTextNode('all items have been processed'))
    document.getElementById('downloads').appendChild(document.createElement('hr'))
    _G.playbackLog.log(' = medias drained')
    // loadMediasCB(null)
  }

  async.each(configuration.schedules, (schedule, callback) => {
    async.each(schedule.layoutPlaylists, (layoutPlaylist, callback) => {
      async.each(layoutPlaylist.playlistMedias, (playlistMedia, callback) => {
        if (playlistMedia.type === 'URL') {
          return callback()
        }
        let downloadElement = document.createElement('div')
        downloadElement.appendChild(
          document.createElement('strong').appendChild(
            document.createTextNode(playlistMedia.mediaEid)
          )
        )
        downloadElement.id = playlistMedia.mediaEid
        downloadElement.style = 'font-size: 5px;'
        document.getElementById('downloads').appendChild(
          downloadElement
        )

        let textElement = document.createElement('div')
        textElement.id = playlistMedia.mediaEid + '_text'

        let progressBar = document.createElement('div')
        downloadElement.appendChild(progressBar)
        progressBar.id = playlistMedia.mediaEid + '_progress'
        progressBar.style.width = '0%'
        progressBar.style['background-color'] = 'lightgray'
        progressBar.style.height = '2px'

        let tempFilePath = path.resolve(_G.MEDIA_DIR, playlistMedia.mediaEid.toString() + '.download')
        let filePath = path.resolve(_G.MEDIA_DIR, playlistMedia.mediaEid.toString())
        fs.access(tempFilePath, fs.F_OK, (err) => {
          if (err) { // Media file not downloading right now.
            fs.access(filePath, fs.F_OK, (err) => {
              if (err) { // Media file not present yet.
                let task = { eid: playlistMedia.mediaEid, tempFilePath: tempFilePath, filePath: filePath, url: playlistMedia.file }
                task.retry = 0
                let enqueueMedia = function(task, callback) {
                  if (task.retry === 0) { _G.playbackLog.log('start task', task.eid) }
                  else { _G.playbackLog.log('retry task ' + task.retry, task.eid) }
                  mediasToLoad.push(
                    task,
                    (err) => {
                      if (err) {
                        task.retry ++
                        _G.playbackLog.log(err, task.eid)
                        // fs.unlinkSync(task.tempFilePath)
                        enqueueMedia(task, callback)
                      }
                      else { callback() }
                    }
                  )
                }
                enqueueMedia(task, callback)
              } else { // Media file already present.
                textElement.appendChild(document.createTextNode('; file exists: ' + filePath))
                progressBar.style['background-color'] = 'green'
                progressBar.style.height = '2px'
                progressBar.style.width = '100%'
                callback()
              }
            })
          } else { // Media file already downloading.
            document.getElementById(playlistMedia.mediaEid).appendChild(document.createTextNode('; file already downloading: ' + tempFilePath))
            callback()
          }
        })
      }, function (err) {
        if (err) { console.error(err.message) }
        callback()
      })
    }, function (err) {
      if (err) { console.error(err.message) }
      callback()
    })
  }, function (err) {
    if (err) { console.error(err.message) }
    loadMediasCB()
  })
}
