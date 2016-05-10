const async = require('async')
const path = require('path')
const request = require('request')
const fs = require('fs')

module.exports = function (screenEid) {
  const screenwerkApi = 'http://localhost:3000/configuration/' + screenEid
  const loadMedias = function (schedules, callback) {
    var mediasToLoad = async.queue(function (task, taskCallback) {
      document.write('<p>Loading media ' + JSON.stringify(task) + '</pre>')

      var tempFilePath = path.resolve(__MEDIA_DIR, task.eid.toString() + '.download')
      var filePath = path.resolve(__MEDIA_DIR, task.eid.toString())
      fs.access(tempFilePath, fs.F_OK, (err) => {
        if (err) {
          fs.access(filePath, fs.F_OK, (err) => {
            if (err) {
              request(task.url)
                .on('response', (res) => {
                  console.log('statusCode: ', res.statusCode, 'headers: ', res.headers['content-type'])
                })
                .on('error', (err) => {
                  console.log(err)
                })
                .on('end', () => {
                  fs.rename(tempFilePath, filePath, function () {
                    taskCallback(null)
                  })
                })
                .pipe(fs.createWriteStream(tempFilePath))

              return
            }
            document.write('File already there: ' + filePath)
            taskCallback(null)
          })

          return
        }
        document.write('File already there: ' + tempFilePath)
        taskCallback(null)
      })
    }, 2)

    mediasToLoad.drain = function () {
      document.write('<h1>all items have been processed</h1>')
      callback(null)
    }

    Object.keys(schedules).forEach((scheduleEid) => {
      var schedule = schedules[scheduleEid]
      Object.keys(schedule.layoutPlaylists).forEach((layoutPlaylistEid) => {
        var layoutPlaylist = schedule.layoutPlaylists[layoutPlaylistEid]
        Object.keys(layoutPlaylist.playlistMedias).forEach((playlistMediaEid) => {
          var playlistMedia = layoutPlaylist.playlistMedias[playlistMediaEid]
          // console.log(playlistMedia)
          mediasToLoad.push(
            { eid: playlistMedia.mediaEid, url: playlistMedia.file },
            function (err) {
              if (err) {
                console.log(err)
                document.write(err)
                return
              }
              document.write('<p>Finished load media ' + playlistMedia.file + '</pre>')
            }
          )
        })
      })
    })
  }

  const packageJson = require('../../package.json')

  const homePath = path.resolve(
    process.env.HOME
      ? process.env.HOME
      : process.env.HOMEDRIVE + process.env.HOMEPATH, packageJson.name)
  if (!fs.existsSync(homePath)) {
    fs.mkdirSync(homePath)
  }

  const __META_DIR = path.resolve(homePath, 'sw-meta')
  if (!fs.existsSync(__META_DIR)) {
    fs.mkdirSync(__META_DIR)
  }
  fs.readdirSync(__META_DIR).forEach(function (download_filename) {
    if (download_filename.split('.').pop() !== 'download') { return }
    console.log('Unlink ' + path.resolve(__META_DIR, download_filename))
    var result = fs.unlinkSync(path.resolve(__META_DIR, download_filename))
    if (result instanceof Error) {
      console.log("Can't unlink " + path.resolve(__META_DIR, download_filename), result)
    }
  })

  const __MEDIA_DIR = path.resolve(homePath, 'sw-media')
  if (!fs.existsSync(__MEDIA_DIR)) {
    fs.mkdirSync(__MEDIA_DIR)
  }
  fs.readdirSync(__MEDIA_DIR).forEach(function (download_filename) {
    if (download_filename.split('.').pop() !== 'download') { return }
    console.log('Unlink ' + path.resolve(__MEDIA_DIR, download_filename))
    var result = fs.unlinkSync(path.resolve(__MEDIA_DIR, download_filename))
    if (result instanceof Error) {
      console.log("Can't unlink " + path.resolve(__MEDIA_DIR, download_filename), result)
    }
  })

  var data = ''
  var tempConfFilePath = path.resolve(__META_DIR, screenEid + '.json.download')
  var confFilePath = path.resolve(__META_DIR, screenEid + '.json')
  request(screenwerkApi)
    .on('response', (res) => {
      console.log('statusCode: ', res.statusCode, 'headers: ', res.headers)
    })
    .on('error', (err) => {
      console.log(err)
    })
    .on('data', (d) => {
      data = data + d
    })
    .on('end', () => {
      loadMedias(JSON.parse(data).schedules, function (err) {
        if (err) {
          console.log(err)
          return err
        }
        fs.rename(tempConfFilePath, confFilePath, function () {
          document.write('hurraa!')
        })
      })
    })
    .pipe(fs.createWriteStream(tempConfFilePath))
}
