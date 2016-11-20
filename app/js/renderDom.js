const async = require('async')
const fs = require('fs')
const util = require('util')
const later = require('later')
const path = require('path')

const getOrderedSchedules = (_G, schedules) => {
  return Object.keys(schedules)
    .sort((a, b) => {
      let sched_a = later.parse.cron(schedules[a].crontab)
      let sched_b = later.parse.cron(schedules[b].crontab)
      schedules[a].prev = new Date(later.schedule(sched_a).prev().getTime())
      schedules[b].prev = new Date(later.schedule(sched_b).prev().getTime())
      return (
        schedules[b].prev < schedules[a].prev
        || (
          schedules[b].prev === schedules[a].prev
          && schedules[b].ordinal < schedules[a].ordinal
        )
      )
    })
    .map((a) => {
      // _G.playbackLog.log(schedules[a])
      return schedules[a]
    })
}

const isValid = (obj) => {
  let now = new Date().getTime()
  let fro = obj.validFrom ? new Date(obj.validFrom).getTime() : now - 1
  let til = obj.validTo ? new Date(obj.validTo) : now + 1
  return (now > fro && now < til)
}

var scheduleTimers = []
module.exports.render = (_G, configuration, mainCallback) => {
  scheduleTimers.forEach((timer) => {
    clearTimeout(timer)
  })
  document.body.style.cursor = 'none'
  if (_G.DEV_MODE) {
    document.body.style.cursor = 'crosshair'
  }
  while (document.getElementById('player').hasChildNodes()) {
    if (typeof document.getElementById('player').lastChild.stopPlayback === 'function') {
      _G.playbackLog.log('stopPlayback before removeChild', document.getElementById('player').lastChild.id)
      document.getElementById('player').lastChild.stopPlayback()
    } else {
      _G.playbackLog.log('No stopPlayback function', document.getElementById('player').lastChild.id)
    }
    document.getElementById('player').removeChild(document.getElementById('player').lastChild)
  }
  let playerRootNode = document.createElement('div')
  playerRootNode.id = configuration.screenEid
  playerRootNode.className = 'screen'
  document.getElementById('player').appendChild(playerRootNode)

  playerRootNode.stopPlayback = function () {
    playerRootNode.playbackStatus = 'stopped'
    _G.playbackLog.log('Stop  all')
    Array.from(this.childNodes).forEach((a) => { a.stopPlayback() })
  }

  let configurationNode = document.createElement('pre')
  configurationNode.className = 'configuration'
  configurationNode.innerHTML = JSON.stringify(configuration, null, 4)
  document.getElementById('player').appendChild(configurationNode)

  // Schedules->layouts
  async.forEachOf(configuration.schedules, (schedule, ix, callback) => {
    schedule.layoutNode = document.createElement('div')
    let layoutNode = schedule.layoutNode
    layoutNode.id = schedule.eid + '.' + schedule.layoutEid
    layoutNode.className = 'layout'
    playerRootNode.appendChild(layoutNode)

    layoutNode.playbackStatus = 'stopped'
    layoutNode.swConfiguration = configuration
    layoutNode.swSchedule = schedule
    layoutNode.timers = []
    let later_sched = later.parse.cron(layoutNode.swSchedule.crontab)
    _G.playbackLog.log(layoutNode.swSchedule.name + ' initialized.', layoutNode.id)

    layoutNode.stopPlayback = function () { // this === layoutNode
      let self = this
      if (self.playbackStatus === 'stopped') {
        _G.playbackLog.log('Already stopped ' + self.swSchedule.name + ' schedule', self.id)
        return
      }

      _G.playbackLog.log('stopPlayback ' + self.swSchedule.name + ' schedule')
      self.timers.forEach((timer) => {
        clearTimeout(timer)
      })
      self.playbackStatus = 'stopped'
      _G.playbackLog.log('Stop layout ' + self.swSchedule.name + ' playlists.')
      Array.from(self.childNodes).forEach((a) => { a.stopPlayback() })
    }

    layoutNode.startPlayback = function () { // this === layoutNode
      let self = this
      _G.playbackLog.log('start ' + self.swSchedule.name, self.id)
      if (self.swSchedule.cleanup) {
        _G.playbackLog.log(self.swSchedule.name + ' requesting cleanup', self.id)
        playerRootNode.stopPlayback()
      } else if (self.playbackStatus === 'started') {
        self.stopPlayback()
      }

      let ms_from_latest_playback = new Date() - new Date(later.schedule(later_sched).prev())
      let ms_until_next_playback = new Date(later.schedule(later_sched).next()) - new Date()

      // dont restart layout if less than a second left to play
      if (ms_until_next_playback < 1000) {
        _G.playbackLog.log('Fix restart playback of schedule ' + self.swSchedule.name + ' in ' + ms_until_next_playback/1e3 + 's.', self.id)
        ms_until_next_playback = new Date(later.schedule(later_sched).next(2)[1]) - new Date()
      }

      // Schedule next occurrance from crontab
      _G.playbackLog.log('Schedule playback of schedule ' + self.swSchedule.name + ' in ' + ms_until_next_playback/1e3 + 's.', self.id)
      scheduleTimers.push(setTimeout(() => {
        self.startPlayback()
      }, ms_until_next_playback))

      // Stop if duration already exceeded by now
      if (self.swSchedule.duration && self.swSchedule.duration * 1e3 < ms_from_latest_playback) {
        _G.playbackLog.log('STOP    ' + self.swSchedule.name
          + '; duration ' + self.swSchedule.duration
          + '; sec_from_latest_playback ' + ms_from_latest_playback/1e3
          , self.id
        )
        self.stopPlayback()
        // Schedule might have duration less than interval between playback
      } else {
        if (self.swSchedule.duration && self.swSchedule.duration * 1e3 < (ms_from_latest_playback + ms_until_next_playback)) {
          let ms_left = self.swSchedule.duration * 1e3 - ms_from_latest_playback
          ms_left = (ms_left < 10 ? 10 : ms_left)
          self.timers.push(setTimeout(function () {
            _G.playbackLog.log('STOP    ' + self.swSchedule.name + ' from timeout.', self.id)
            self.stopPlayback()
          }, ms_left))
        }
        self.playbackStatus = 'started'
        _G.playbackLog.log(self.swSchedule.name + ' layout status = "started".', self.id)

        // Start layout playlists (delayed a bit to avoid simultaneous pause/play)
        self.timers.push(setTimeout(function () {
          Array.from(self.childNodes).forEach((a) => {
            _G.playbackLog.log('START   ' + self.swSchedule.name + ' from timeout timer.', self.id)
            a.startPlayback()
          })
        }, 10))
      }
    }

    // Playlists
    async.forEachOf(layoutNode.swSchedule.layoutPlaylists, (swPlaylist, layoutPlaylistEid, callback) => {
      swPlaylist.playlistNode = document.createElement('div')
      let playlistNode = swPlaylist.playlistNode
      layoutNode.appendChild(playlistNode)
      playlistNode.id = playlistNode.parentNode.id + '.' + swPlaylist.playlistEid
      playlistNode.className = 'playlist'
      playlistNode.swPlaylist = swPlaylist
      if (swPlaylist.inPixels) {
        playlistNode.style.top = (swPlaylist.top / layoutNode.swSchedule.height * 100) + '%'
        playlistNode.style.left = (swPlaylist.left / layoutNode.swSchedule.width * 100) + '%'
        playlistNode.style.width = (swPlaylist.width / layoutNode.swSchedule.width * 100) + '%'
        playlistNode.style.height = (swPlaylist.height / layoutNode.swSchedule.height * 100) + '%'
      }
      else {
        playlistNode.style.top = swPlaylist.top + '%'
        playlistNode.style.left = swPlaylist.left + '%'
        playlistNode.style.width = swPlaylist.width + '%'
        playlistNode.style.height = swPlaylist.height + '%'
      }

      if (swPlaylist.validFrom || swPlaylist.validTo) {
        _G.playbackLog.log('Fro: ' + swPlaylist.validFrom + ' Til: ' + swPlaylist.validTo, playlistNode.id)
      }

      playlistNode.stopPlayback = function () { // this === playlistNode
        let self = this
        if (self.playbackStatus === 'stopped') {
          _G.playbackLog.log('Already stopped ' + self.swPlaylist.name + ' layoutPlaylist', self.id)
          return
        }
        self.playbackStatus = 'stopped'
        _G.playbackLog.log('Stop  playlist ' + self.swPlaylist.name, self.id)
        Array.from(this.childNodes).forEach((a) => { a.stopPlayback() })
      }

      playlistNode.startPlayback = function () { // this === playlistNode
        let self = this
        if (self.playbackStatus === 'started') {
          _G.playbackLog.log('Already started ' + self.swPlaylist.name + ' layoutPlaylist', self.id)
          return
        }
        self.playbackStatus = 'started'
        _G.playbackLog.log('Start playlist ' + self.swPlaylist.name, self.id)
        self.firstChild.startPlayback()
      }

      // Medias
      let firstMediaNode
      let lastMediaNode
      async.forEachOf(swPlaylist.playlistMedias, (swMedia, playlistMediaEid, callback) => {
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

        if (swMedia.validFrom || swMedia.validTo) {
          _G.playbackLog.log('Fro: ' + swMedia.validFrom + ' Til: ' + swMedia.validTo, mediaNode.id)
        }

        mediaNode.stopPlayback = function () { // this === mediaNode
          let self = this
          self.timers.forEach((timer) => {
            clearTimeout(timer)
          })
          if (self.playbackStatus === 'stopped') {
            _G.playbackLog.log('Already stopped ' + self.swMedia.name + ' playlistMedias', self.id)
            return
          }
          self.playbackStatus = 'stopped'
          _G.playbackLog.log('Stop  media ' + ' ' + self.swMedia.name, self.id)
          self.style.visibility = 'hidden'
          this.firstChild.pause()
          this.firstChild.currentTime = 0
        }

        mediaNode.startPlayback = function () { // this === mediaNode
          let self = this
          if (self.playbackStatus === 'started') {
            _G.playbackLog.log('Already started ' + self.name + ' playlistMedias', self.id)
            return
          }
          if (self.playlistNode.playbackStatus !== 'started') {
            _G.playbackLog.log('Cant start ' + self.name + ' playlistMedias in stopped playlist', self.id)
            return
          }

          if (!isValid(self.swMedia)) {
            _G.playbackLog.log('Media not valid currently: ' + self.swMedia.validFrom + '<' + new Date() + '<' + self.swMedia.validTo, self.swMedia.playlistMediaEid)
            if (self.nextMediaNode) {
              self.nextMediaNode.startPlayback()
              return
            } else {
              _G.playbackLog.log('Playlist finished. No next media to load.', self.id)
            }
          }

          self.playbackStatus = 'started'
          _G.playbackLog.log('Start media ' + self.swMedia.name, self.id)
          self.style.visibility = 'visible'
          this.firstChild.currentTime = 0
          try {
            this.firstChild.play()
          } catch (err) {
            _G.playbackLog.log('media.play() errored for ' + self.id + '.', self.id)
            _G.playbackLog.log(err, self.id)
          }
            // .catch( function(reason) {
            //   console.log(reason)
            //   _G.playbackLog.log('media.play() errored for ' + self.id + '.', reason)
            // })
          if (self.swMedia.duration) {
            let delayedStopPlayback = function() { // don't forget to bind "this"
              _G.playbackLog.log('mediaNode.stopPlayback() from "media duration exceeded" event.' + this.swMedia.duration, this.id)
              // _G.playbackLog.log('mediaNode.stopPlayback() from "media duration exceeded" event.', this.id)
              this.stopPlayback()
              if (this.nextMediaNode) {
                _G.playbackLog.log('Load next media.', this.id)
                this.timers.push(setTimeout(this.startPlayback.bind(this.nextMediaNode), this.swMedia.delay * 1e3))
              } else {
                _G.playbackLog.log('Playlist finished. No next media to load.', this.id)
              }
            }
            self.timers.push(setTimeout(delayedStopPlayback.bind(self), self.swMedia.duration * 1e3) )
          }
        }
        insertMedia(_G, mediaNode, swMedia, callback)
      }, function (err) {
        if (swPlaylist.loop !== false) {
          _G.playbackLog.log('Set loop', playlistNode.id)
          lastMediaNode.nextMediaNode = firstMediaNode
        } else {
          _G.playbackLog.log('Do not loop', playlistNode.id)
        }
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
    _G.playbackLog.log(_G.codes.DOM_RENDERED)
    getOrderedSchedules(_G, configuration.schedules)
      .forEach((a) => {
        _G.playbackLog.log('Start playback of ' + a.name, a.eid)
        a.layoutNode.startPlayback()
      })
  })
}

const insertMedia = (_G, mediaNode, swMedia, callback) => {
  // _G.playbackLog.log('Insert media ' + swMedia.mediaEid + '(' + mediaNode.id + ').', swMedia.type)
  mediaNode.timers = []
  let mediaDomElement
  if (swMedia.type === _G.codes.MEDIA_TYPE_VIDEO) {
    mediaDomElement = document.createElement('VIDEO')
    let mimetype = 'video/' + swMedia.fileName.split('.')[swMedia.fileName.split('.').length - 1]
    mediaDomElement.type = mimetype
    // _G.playbackLog.log(mimetype)
    mediaDomElement.src = path.resolve(_G.MEDIA_DIR, swMedia.mediaEid.toString())
    mediaDomElement.overflow = 'hidden'
    mediaDomElement.autoplay = false
    mediaDomElement.controls = _G.DEV_MODE
    mediaDomElement.muted = swMedia.mute
    mediaNode.appendChild(mediaDomElement)
    mediaDomElement.id = mediaNode.id + '.video'
    mediaDomElement.addEventListener('durationchange', () => {
      _G.playbackLog.log('Video media duration ' + mediaDomElement.duration + 'sec', mediaNode.id)
    })
    mediaDomElement.addEventListener('play', () => {
      _G.playbackLog.log('Video media started', mediaNode.id)
    })
    mediaDomElement.addEventListener('ended', () => {
      _G.playbackLog.log('Video media ended. Start delay ' + swMedia.delay * 1e3 + 'ms', mediaNode.id)
      // _G.playbackLog.log('mediaNode.stopPlayback() from "video ended" event.')
      mediaNode.stopPlayback()
      mediaNode.timers.push(setTimeout(function () {
        mediaNode.nextMediaNode.startPlayback()
      }, swMedia.delay * 1e3))
    })
    return callback()
  }
  else if (swMedia.type === _G.codes.MEDIA_TYPE_AUDIO) {
    let mediaDomElement = document.createElement('AUDIO')
    mediaDomElement.src = path.resolve(_G.MEDIA_DIR, swMedia.mediaEid.toString())
    mediaNode.appendChild(mediaDomElement)
    mediaDomElement.id = mediaNode.id + '.audio'
    mediaDomElement.addEventListener('ended', () => {
      _G.playbackLog.log('mediaNode.stopPlayback() from "audio ended" event.', mediaNode.id)
      mediaNode.stopPlayback()
      mediaNode.timers.push(setTimeout(function () {
        mediaNode.nextMediaNode.startPlayback()
      }, swMedia.delay * 1e3))
    })
    return callback()
  }
  else if (swMedia.type === _G.codes.MEDIA_TYPE_IMAGE) {
    let mediaDomElement = document.createElement('IMG')
    mediaDomElement.src = path.resolve(_G.MEDIA_DIR, swMedia.mediaEid.toString())
    mediaNode.appendChild(mediaDomElement)
    mediaDomElement.id = mediaNode.id + '.img'
    // Properties and methods not present natively
    // mediaDomElement.currentTime = 0
    mediaDomElement.play = () => {}
    mediaDomElement.pause = () => {}
    return callback()
  }
  else if (swMedia.type === _G.codes.MEDIA_TYPE_URL) {
    let mediaDomElement = document.createElement('IFRAME')
    mediaDomElement.src = swMedia.url
    mediaDomElement.scrolling = 'yes'
    mediaNode.appendChild(mediaDomElement)
    mediaDomElement.id = mediaNode.id + '.url'
    // Properties and methods not present natively
    // mediaDomElement.currentTime = 0
    mediaDomElement.play = function() {
      console.log('reloading ', mediaDomElement)
      mediaDomElement.contentWindow.location.reload()
    }
    mediaDomElement.pause = () => {}
    return callback()
  }
}
