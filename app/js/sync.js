const async = require('async')
const path = require('path')
const request = require('request')
const fs = require('fs')

module.exports.fetchConfiguration = (_G, callback) => {
  if (document.getElementById('downloads') === null) {
    let downloadDiv = document.createElement('div')
    downloadDiv.id = 'downloads'
    document.body.appendChild(downloadDiv)
  } else {
    document.getElementById('downloads').style.visibility = 'hidden'
  }

  fs.readFile(_G.confFilePath, (err, configuration) => {
    if (err) {
      _G.playbackLog.log(err)
    }
    else {
      _G.configurationTs = (new Date(JSON.parse(configuration).publishedAt)).getTime()
      // _G.playbackLog.log(_G.configurationTs)
    }

    let data = ''
    _G.playbackLog.log('Requesting ' + _G.SCREENWERK_API + _G.SCREEN_EID)
    let request_ended = false
    request(_G.SCREENWERK_API + _G.SCREEN_EID)
    .on('response', (res) => {
      if (res.statusCode !== 200) {
        _G.playbackLog.log('statusCode: ' + res.statusCode)
        _G.playbackLog.log(res.headers)
        _G.playbackLog.log('CALLBACK from response')
        return callback(res)
      }
      else {
        // console.info('statusCode: ', res.statusCode, 'headers: ', res.headers)
      }
    })
    .on('error', (err) => {
      _G.playbackLog.log('ERROR:', err)
      _G.playbackLog.log('CALLBACK from error')
      return callback(err)
    })
    .on('data', (d) => {
      data = data + d
    })
    .on('end', () => {
      // could it be that end event is fired twice?!
      if (request_ended) { return }
      request_ended = true

      let configuration = JSON.parse(data)
      if (configuration.error) {
        // window.alert(data)
        fs.unlink(_G.tempConfFilePath, () => {
          if (configuration.error.code === 401) {
            // console.info('INFO:', data)
            _G.playbackLog.log('CALLBACK from end conf error 401')
            return callback(configuration.error, _G.codes.CONFIGURATION_NOT_AVAILABLE_YET)
          }
          else {
            console.error('ERROR:', data)
            _G.playbackLog.log('CALLBACK from end conf error')
            return callback(configuration.error, _G.codes.CONFIGURATION_FETCH_FAILED)
          }
        })
        // return
      }
      // console.info('INFO:', data)
      let configurationTs = new Date(configuration.publishedAt).getTime()
      if (configurationTs === _G.configurationTs) {
        fs.unlink(_G.tempConfFilePath, () => {
          // _G.playbackLog.log(_G.codes.CONFIGURATION_NOT_UPDATED)
          _G.playbackLog.log('CALLBACK from CONFIGURATION_NOT_UPDATED')
          return callback(null, _G.codes.CONFIGURATION_NOT_UPDATED)
        })
      } else {
        _G.playbackLog.log('got updates')
        _G.playbackLog.log('_G.configurationTs <- configurationTs: ' + _G.configurationTs + ' <- ' + configurationTs)
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
              (err) => {
                if (err) _G.playbackLog.log(err)
                _G.playbackLog.log('CALLBACK from async unlink')
                return callback(null, _G.codes.CONFIGURATION_UPDATED)
              }
            )
          })
        })
      }
    })
    .pipe(fs.createWriteStream(_G.tempConfFilePath))
  })
}

const loadMedias = (_G, configuration, callback) => {
  var bytesToSize = (bytes) => {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0'
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10)
    var decimals = Math.max(0, i - 1)
    return (bytes / Math.pow(1024, i)).toFixed(decimals) + ' ' + sizes[i]
  }

  const queueConcurrency = 4
  var mediasToLoad = async.queue((task, taskCallback) => {
    var fileSize = 0
    var downloadedSize = 0
    var progressBar = document.getElementById(task.eid + '_progress')
    progressBar.style.width = '0%'
    progressBar.style['background-color'] = 'lightgray'
    progressBar.style.height = '5px'
    fs.access(task.tempFilePath, fs.F_OK, (err) => {
      if (err) {
        fs.access(task.filePath, fs.F_OK, (err) => {
          if (err) {
            request(task.url)
              .on('response', (res) => {
                _G.playbackLog.log(res.headers)
                fileSize = res.headers['content-length']
                var textNode = document.createTextNode('; ' + bytesToSize(fileSize) + ' to download.')
                document.getElementById(task.eid).appendChild(textNode)
                document.getElementById(task.eid).appendChild(progressBar)
              })
              .on('error', (err) => {
                _G.playbackLog.log(err)
                taskCallback(err)
              })
              .on('data', (d) => {
                downloadedSize = downloadedSize + d.length
                progressBar.style.width = (downloadedSize / fileSize * 100) + '%'
              })
              .on('end', () => {
                progressBar.style['background-color'] = 'green'
                progressBar.style.height = '2px'
                fs.rename(task.tempFilePath, task.filePath, () => {
                  taskCallback(null)
                })
              })
              .pipe(fs.createWriteStream(task.tempFilePath))

            return
          }
          progressBar.style['background-color'] = 'green'
          progressBar.style.height = '20px'
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
    callback(null)
  }

  async.each(configuration.schedules, (schedule, callback) => {
    async.each(schedule.layoutPlaylists, (layoutPlaylist, callback) => {
      async.each(layoutPlaylist.playlistMedias, (playlistMedia, callback) => {
        let downloadElement = document.createElement('div')
        downloadElement.appendChild(
          document.createElement('strong').appendChild(
            document.createTextNode(playlistMedia.mediaEid)
          )
        )
        downloadElement.id = playlistMedia.mediaEid
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
        progressBar.style.height = '5px'

        let tempFilePath = path.resolve(_G.MEDIA_DIR, playlistMedia.mediaEid.toString() + '.download')
        let filePath = path.resolve(_G.MEDIA_DIR, playlistMedia.mediaEid.toString())
        fs.access(tempFilePath, fs.F_OK, (err) => {
          if (err) { // Media file not downloading right now.
            fs.access(filePath, fs.F_OK, (err) => {
              if (err) { // Media file not present yet.
                mediasToLoad.push(
                  { eid: playlistMedia.mediaEid, tempFilePath: tempFilePath, filePath: filePath, url: playlistMedia.file },
                  (err) => {
                    if (err) {
                      console.error(err)
                      textElement.appendChild(document.createTextNode(err))
                    }
                    callback()
                  }
                )
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
    callback()
  })
}
