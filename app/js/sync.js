const async = require('async')
const path = require('path')
const request = require('request')
const fs = require('fs')

module.exports.fetchConfiguration = (_G, callback) => {
  let data = ''
  request(_G.screenwerkApi)
    .on('response', (res) => {
      console.log('statusCode: ', res.statusCode, 'headers: ', res.headers)
    })
    .on('error', (err) => {
      callback(err)
    })
    .on('data', (d) => {
      data = data + d
    })
    .on('end', () => {
      loadMedias(_G, JSON.parse(data), () => {
        fs.rename(_G.tempConfFilePath, _G.confFilePath, () => {
          callback(null)
        })
      })
    })
    .pipe(fs.createWriteStream(_G.tempConfFilePath))
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
                console.log(res.headers)
                fileSize = res.headers['content-length']
                var textNode = document.createTextNode('; ' + bytesToSize(fileSize) + ' to download.')
                document.getElementById(task.eid).appendChild(textNode)
                document.getElementById(task.eid).appendChild(progressBar)
              })
              .on('error', (err) => {
                console.log(err)
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
    document.body.appendChild(document.createElement('hr'))
    document.body.appendChild(document.createTextNode('all items have been processed'))
    document.body.appendChild(document.createElement('hr'))
    callback(null)
  }

  let schedules = configuration.schedules
  Object.keys(schedules).forEach((scheduleEid) => {
    var schedule = schedules[scheduleEid]
    Object.keys(schedule.layoutPlaylists).forEach((layoutPlaylistEid) => {
      var layoutPlaylist = schedule.layoutPlaylists[layoutPlaylistEid]
      Object.keys(layoutPlaylist.playlistMedias).forEach((playlistMediaEid) => {
        var playlistMedia = layoutPlaylist.playlistMedias[playlistMediaEid]
        // console.log(playlistMedia)
        var downloadElement = document.createElement('div')
        downloadElement.appendChild(
          document.createElement('strong').appendChild(
            document.createTextNode(playlistMedia.mediaEid)
          )
        )
        downloadElement.id = playlistMedia.mediaEid
        document.body.appendChild(
          downloadElement
        )

        var textElement = document.createElement('div')
        textElement.id = playlistMedia.mediaEid + '_text'

        var progressBar = document.createElement('div')
        downloadElement.appendChild(progressBar)
        progressBar.id = playlistMedia.mediaEid + '_progress'
        progressBar.style.width = '0%'
        progressBar.style['background-color'] = 'lightgray'
        progressBar.style.height = '5px'

        var tempFilePath = path.resolve(_G.MEDIA_DIR, playlistMedia.mediaEid.toString() + '.download')
        var filePath = path.resolve(_G.MEDIA_DIR, playlistMedia.mediaEid.toString())
        fs.access(tempFilePath, fs.F_OK, (err) => {
          if (err) { // Media file not downloading right now.
            fs.access(filePath, fs.F_OK, (err) => {
              if (err) { // Media file not present yet.
                mediasToLoad.push(
                  { eid: playlistMedia.mediaEid, tempFilePath: tempFilePath, filePath: filePath, url: playlistMedia.file },
                  (err) => {
                    if (err) {
                      console.log(err)
                      textElement.appendChild(document.createTextNode(err))
                    }
                  }
                )
              } else { // Media file already present.
                textElement.appendChild(document.createTextNode('; file exists: ' + filePath))
                progressBar.style['background-color'] = 'green'
                progressBar.style.height = '2px'
                progressBar.style.width = '100%'
              }
            })
          } else { // Media file already downloading.
            document.getElementById(playlistMedia.mediaEid).appendChild(document.createTextNode('; file already downloading: ' + tempFilePath))
          }
        })
      })
    })
  })
}
