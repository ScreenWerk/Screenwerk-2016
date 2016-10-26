const async = require('async')
const fs = require('fs')
const later = require('later')
const path = require('path')

const getOrderedSchedules = (schedules) => {
  return Object.keys(schedules)
    .sort((a, b) => {
      let sched_a = later.parse.cron(schedules[a].crontab)
      let sched_b = later.parse.cron(schedules[b].crontab)
      schedules[a].prev = new Date(later.schedule(sched_a).prev().getTime())
      schedules[b].prev = new Date(later.schedule(sched_b).prev().getTime())
      return schedules[a].prev > schedules[b].prev
    })
    .map((a) => {
      console.log(schedules[a].prev)
      return schedules[a]
    })
}

const getNextSchedule = (schedules) => {
  let nextSchedule = schedules[Object.keys(schedules)[0]]
  console.log('Set next', nextSchedule)
  Object.keys(schedules).forEach((a) => {
    console.log('Test', schedules[a])
    let crtab = schedules[a].crontab
    let sched = later.parse.cron(crtab)
    let now = new Date()
    now.setSeconds(now.getSeconds() + 1)
    schedules[a].next = new Date(later.schedule(sched).next(1, now).getTime())
    if (nextSchedule.next > schedules[a].next) {
      nextSchedule = schedules[a]
      console.log('Next', nextSchedule)
    }
  })
  return nextSchedule
}

// const getNextEventDelayMs = (schedule) => {
//   let crtab = schedule.crontab
//   let sched = later.parse.cron(crtab)
//   let now = new Date()
//   console.log(later.schedule(sched).next(1, now).getTime())
// }


module.exports.render = (_G, configuration, mainCallback) => {
  document.body.style.cursor = 'none'
  if (_G.DEV_MODE) {
    document.body.style.cursor = 'crosshair'
  }
  while (document.getElementById('player').hasChildNodes()) {
    document.getElementById('player').removeChild(document.getElementById('player').lastChild)
  }
  let playerRootNode = document.createElement('div')
  playerRootNode.id = configuration.screenEid
  playerRootNode.className = 'screen'
  document.getElementById('player').appendChild(playerRootNode)

  playerRootNode.stopPlayback = function () {
    playerRootNode.playbackStatus = 'stopped'
    _G.playbackLog.write(new Date().toJSON() + ' Stop  all' + '\n')
    Array.from(this.childNodes).forEach((a) => { a.stopPlayback() })
  }

  let configurationNode = document.createElement('pre')
  configurationNode.className = 'configuration'
  configurationNode.innerHTML = JSON.stringify(configuration, null, 4)
  document.getElementById('player').appendChild(configurationNode)

  // Schedules->layouts
  async.forEachOf(configuration.schedules, (schedule, scheduleEid, callback) => {
    schedule.layoutNode = document.createElement('div')
    let layoutNode = schedule.layoutNode
    layoutNode.swConfiguration = configuration
    // layoutNode.swSchedule = schedule
    playerRootNode.appendChild(layoutNode)
    layoutNode.id = layoutNode.parentNode.id + '.' + schedule.layoutEid
    layoutNode.className = 'layout'
    layoutNode.getNextSchedule = getNextSchedule

    layoutNode.stopPlayback = function () {
      layoutNode.playbackStatus = 'stopped'
      _G.playbackLog.write(new Date().toJSON() + ' Stop  layout ' + layoutNode.id + '\n')
      Array.from(this.childNodes).forEach((a) => { a.stopPlayback() })
    }

    layoutNode.startPlayback = function () { // this === layoutNode
      layoutNode.playbackStatus = 'started'
      if (schedule.cleanup) {
        _G.playbackLog.write(new Date().toJSON() + ' Schedule ' + schedule.eid + ' requesting cleanup\n')
        playerRootNode.stopPlayback()
      }
      let nextSchedule = this.getNextSchedule(this.swConfiguration.schedules)
      let self = this
      setTimeout(function () {
        _G.playbackLog.write(new Date().toJSON() + ' Start layout ' + layoutNode.id + '. Play for ' + (nextSchedule.next - new Date()) + ' ms.' + '\n')
        Array.from(self.childNodes).forEach((a) => {
          // console.log(a)
          a.startPlayback()
        })
      }, 10)
      // setTimeout(() => {
      //   nextSchedule.layoutNode.startPlayback()
      //   self.stopPlayback()
      // }, nextSchedule.next - new Date())
    }

    // Playlists
    async.forEachOf(schedule.layoutPlaylists, (playlist, layoutPlaylistEid, callback) => {
      playlist.playlistNode = document.createElement('div')
      let playlistNode = playlist.playlistNode
      // playlistNode.swPlaylist = playlist
      layoutNode.appendChild(playlistNode)
      playlistNode.id = playlistNode.parentNode.id + '.' + playlist.playlistEid
      playlistNode.className = 'playlist'
      if (playlist.inPixels) {
        playlistNode.style.top = (playlist.top / schedule.height * 100) + '%'
        playlistNode.style.left = (playlist.left / schedule.width * 100) + '%'
        playlistNode.style.width = (playlist.width / schedule.width * 100) + '%'
        playlistNode.style.height = (playlist.height / schedule.height * 100) + '%'
      }
      else {
        playlistNode.style.top = playlist.top + '%'
        playlistNode.style.left = playlist.left + '%'
        playlistNode.style.width = playlist.width + '%'
        playlistNode.style.height = playlist.height + '%'
      }

      playlistNode.stopPlayback = function () {
        playlistNode.playbackStatus = 'stopped'
        _G.playbackLog.write(new Date().toJSON() + ' Stop  playlist ' + playlistNode.id + '\n')
        Array.from(this.childNodes).forEach((a) => { a.stopPlayback() })
      }

      playlistNode.startPlayback = function () { // this === playlistNode
        playlistNode.playbackStatus = 'started'
        _G.playbackLog.write(new Date().toJSON() + ' Start playlist ' + playlistNode.id + '\n')
        this.firstChild.startPlayback()
      }

      // Medias
      let firstMediaNode
      let lastMediaNode
      async.forEachOf(playlist.playlistMedias, (swMedia, playlistMediaEid, callback) => {
        swMedia.mediaNode = document.createElement('div')
        let mediaNode = swMedia.mediaNode
        mediaNode.playlistNode = playlistNode
        mediaNode.swMedia = swMedia

        if (firstMediaNode === undefined) { firstMediaNode = mediaNode }
        if (lastMediaNode !== undefined) {
          lastMediaNode.nextMediaNode = mediaNode
        }
        lastMediaNode = mediaNode

        playlistNode.appendChild(mediaNode)
        mediaNode.id = mediaNode.parentNode.id + '.' + swMedia.mediaEid
        mediaNode.style.visibility = 'hidden'
        mediaNode.className = 'media'

        mediaNode.stopPlayback = function () {
          mediaNode.timers.forEach((timer) => {
            clearTimeout(timer)
          })
          mediaNode.playbackStatus = 'stopped'
          _G.playbackLog.write(new Date().toJSON() + ' Stop  media ' + mediaNode.id + '\n')
          mediaNode.style.visibility = 'hidden'
          this.firstChild.pause()
          this.firstChild.currentTime = 0
        }

        mediaNode.startPlayback = function () { // this === mediaNode
          if (mediaNode.playlistNode.playbackStatus === 'started') {
            mediaNode.playbackStatus = 'started'
            _G.playbackLog.write(new Date().toJSON() + ' Start media ' + mediaNode.id + '\n')
            mediaNode.style.visibility = 'visible'
            this.firstChild.currentTime = 0
            this.firstChild.play()
          }
        }
        insertMedia(_G, mediaNode, swMedia, callback)
      }, function (err) {
        lastMediaNode.nextMediaNode = firstMediaNode
        if (err) { console.error(err.message) }
        callback()
      })
    }, function (err) {
      if (err) { console.error(err.message) }
      callback()
    })
  }, function (err) {
    if (err) { console.error(err.message) }
    mainCallback(null, _G.codes.DOM_RENDERED)
    console.log(_G.codes.DOM_RENDERED)
    getOrderedSchedules(configuration.schedules)
      .forEach((a) => {
        a.layoutNode.startPlayback()
      })
  })
}

const insertMedia = (_G, mediaNode, swMedia, callback) => {
  // console.log('Insert media ' + swMedia.mediaEid + '(' + mediaNode.id + ').', swMedia.type)
  mediaNode.timers = []
  let mediaDomElement
  if (swMedia.type === _G.codes.MEDIA_TYPE_VIDEO) {
    mediaDomElement = document.createElement('VIDEO')
    let mimetype = 'video/' + swMedia.fileName.split('.')[swMedia.fileName.split('.').length - 1]
    mediaDomElement.type = mimetype
    // console.log(mimetype)
    mediaDomElement.src = path.resolve(_G.MEDIA_DIR, swMedia.mediaEid.toString())
    mediaDomElement.overflow = 'hidden'
    mediaDomElement.autoplay = false
    mediaDomElement.controls = _G.DEV_MODE
    mediaDomElement.muted = swMedia.mute
    mediaNode.appendChild(mediaDomElement)
    mediaDomElement.id = mediaNode.id + '.video'
    mediaDomElement.addEventListener('durationchange', () => {
      _G.playbackLog.write(new Date().toJSON() + ' Video media ' + mediaNode.id + ' duration ' + mediaDomElement.duration + 'sec\n')
    })
    mediaDomElement.addEventListener('play', () => {
      _G.playbackLog.write(new Date().toJSON() + ' Video media ' + mediaNode.id + ' started\n')
    })
    mediaDomElement.addEventListener('ended', () => {
      _G.playbackLog.write(new Date().toJSON() + ' Video media ' + mediaNode.id + ' ended. Start delay ' + swMedia.delay * 1e3 + 'ms\n')
      // console.log('mediaNode.stopPlayback() from "video ended" event.')
      mediaNode.stopPlayback()
      mediaNode.timers.push(setTimeout(function () {
        mediaNode.nextMediaNode.startPlayback()
      }, swMedia.delay * 1e3))
    })
    if (swMedia.duration) {
      mediaNode.timers.push(setTimeout(function () {
        console.log('mediaNode.stopPlayback() from "video duration exceeded" event.')
        mediaNode.stopPlayback()
        mediaNode.timers.push(setTimeout(function () {
          mediaNode.nextMediaNode.startPlayback()
        }, swMedia.delay * 1e3))
      }, swMedia.duration * 1e3))
    }
    callback()
  }
  else if (swMedia.type === _G.codes.MEDIA_TYPE_AUDIO) {
    let mediaDomElement = document.createElement('AUDIO')
    mediaDomElement.src = path.resolve(_G.MEDIA_DIR, swMedia.mediaEid.toString())
    mediaNode.appendChild(mediaDomElement)
    mediaDomElement.id = mediaNode.id + '.audio'
    mediaDomElement.addEventListener('ended', () => {
      console.log('mediaNode.stopPlayback() from "audio ended" event.')
      mediaNode.stopPlayback()
      mediaNode.timers.push(setTimeout(function () {
        mediaNode.nextMediaNode.startPlayback()
      }, swMedia.delay * 1e3))
    })
    if (swMedia.duration) {
      mediaNode.timers.push(setTimeout(function () {
        console.log('mediaNode.stopPlayback() from "audio duration exceeded" event.')
        mediaNode.stopPlayback()
        mediaNode.timers.push(setTimeout(function () {
          mediaNode.nextMediaNode.startPlayback()
        }, swMedia.delay * 1e3))
      }, swMedia.duration * 1e3))
    }
    callback()
  }
  else if (swMedia.type === _G.codes.MEDIA_TYPE_IMAGE) {
    let mediaDomElement = document.createElement('IMG')
    mediaDomElement.src = path.resolve(_G.MEDIA_DIR, swMedia.mediaEid.toString())
    mediaNode.appendChild(mediaDomElement)
    mediaDomElement.id = mediaNode.id + '.img'
    // Properties and methods not present natively
    // mediaDomElement.currentTime = 0
    mediaDomElement.play = () => {
      // If duration is not set, the image will stay on screen until playlist gets cleaned
      if (swMedia.duration) {
        mediaNode.timers.push(setTimeout(function () {
          console.log('mediaNode.stopPlayback() from "image ended" event.', swMedia)
          mediaNode.stopPlayback()
          mediaNode.timers.push(setTimeout(function () {
            mediaNode.nextMediaNode.startPlayback()
          }, swMedia.delay * 1e3))
        }, swMedia.duration * 1e3))
      }
    }
    mediaDomElement.pause = () => {}
    callback()
  }
  else if (swMedia.type === _G.codes.MEDIA_TYPE_URL) {
    let mediaDomElement = document.createElement('IFRAME')
    mediaDomElement.src = swMedia.url
    mediaDomElement.scrolling = 'yes'
    mediaNode.appendChild(mediaDomElement)
    mediaDomElement.id = mediaNode.id + '.url'
    // Properties and methods not present natively
    // mediaDomElement.currentTime = 0
    mediaDomElement.play = () => {
      mediaNode.timers.push(setTimeout(function () {
        console.log('mediaNode.stopPlayback() from "URL ended" event.')
        mediaNode.stopPlayback()
        mediaNode.timers.push(setTimeout(function () {
          mediaNode.nextMediaNode.startPlayback()
        }, swMedia.delay * 1e3))
      }, swMedia.duration * 1e3))
    }
    mediaDomElement.pause = () => {}
    callback()
  }
}
