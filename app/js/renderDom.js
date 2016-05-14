const async = require('async')
const path = require('path')
const fs = require('fs')
const later = require('later')

module.exports.render = (_G, configuration, mainCallback) => {
  while (document.getElementById('player').hasChildNodes()) {
    document.getElementById('player').removeChild(document.getElementById('player').lastChild)
  }
  let playerRootNode = document.createElement('div')
  playerRootNode.id = configuration.screen.eid
  playerRootNode.className = 'screen'
  document.getElementById('player').appendChild(playerRootNode)

  let configurationNode = document.createElement('pre')
  configurationNode.innerHTML = JSON.stringify(configuration, null, 4)
  document.getElementById('player').appendChild(configurationNode)

  async.forEachOf(configuration.schedules, (schedule, scheduleEid, callback) => {
    let layoutNode = document.createElement('div')
    playerRootNode.appendChild(layoutNode)
    layoutNode.id = layoutNode.parentNode.id + '.' + schedule.layoutEid
    layoutNode.className = 'layout'
    // let layoutWidth = Object.keys(schedule.layoutPlaylists)
    //   .map((a) => { return Number(a.left) + Number(a.width) })
    //   .reduce((a, b) => { return Math.max(a, b) })
    async.forEachOf(schedule.layoutPlaylists, (playlist, layoutPlaylistEid, callback) => {
      let playlistNode = document.createElement('div')
      layoutNode.appendChild(playlistNode)
      playlistNode.id = playlistNode.parentNode.id + '.' + playlist.playlistEid
      playlistNode.className = 'playlist'
      playlistNode.style.top = playlist.top + '%'
      playlistNode.style.left = playlist.left + '%'
      playlistNode.style.width = playlist.width + '%'
      playlistNode.style.height = playlist.height + '%'
      async.forEachOf(playlist.playlistMedias, (media, playlistMediaEid, callback) => {
        let mediaNode = document.createElement('div')
        playlistNode.appendChild(mediaNode)
        mediaNode.id = mediaNode.parentNode.id + '.' + media.mediaEid
        mediaNode.className = 'media'
        insertMedia(_G, mediaNode, media, callback)
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
    mainCallback(null, _G.codes.DOM_RENDERED)
  })
}

const insertMedia = (_G, mediaNode, media, callback) => {
  console.log(media.mediaEid, media.type)
  if (media.type === _G.codes.MEDIA_TYPE_VIDEO) {
    let media_dom_element = document.createElement('VIDEO')
    let mimetype = 'video/' + media.fileName.split('.')[media.fileName.split('.').length - 1]
    media_dom_element.type = mimetype
    // console.log(mimetype)
    media_dom_element.src = path.resolve(_G.MEDIA_DIR, media.mediaEid.toString())
    media_dom_element.overflow = 'hidden'
    media_dom_element.autoplay = false
    media_dom_element.controls = true
    media_dom_element.muted = (media.mute && media.mute === 'True')
    mediaNode.appendChild(media_dom_element)
  } else if (media.type === _G.codes.MEDIA_TYPE_URL) {
    let media_dom_element = document.createElement('IFRAME')
    media_dom_element.id = 'if' + media.mediaEid
    media_dom_element.src = media.url
    media_dom_element.scrolling = 'no'
    mediaNode.appendChild(media_dom_element)
  } else if (media.type === _G.codes.MEDIA_TYPE_IMAGE) {
    let media_dom_element = document.createElement('IMG')
    media_dom_element.src = path.resolve(_G.MEDIA_DIR, media.mediaEid.toString())
    mediaNode.appendChild(media_dom_element)
  }
}
