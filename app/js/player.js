const async = require('async')
const path = require('path')
const fs = require('fs')
const later = require('later')

const getCurrentSchedule = (schedules) => {
  let currentSchedule = schedules[Object.keys(schedules)[0]]
  Object.keys(schedules).forEach((a) => {
    let crtab = schedules[a].crontab
    let sched = later.parse.cron(crtab)
    schedules[a].prev = new Date(later.schedule(sched).prev().getTime())
    if (currentSchedule.prev < schedules[a].prev) {
      currentSchedule = schedules[a]
    }
  })
  return currentSchedule
}

const getNextSchedule = (schedules) => {
  let nextSchedule = schedules[Object.keys(schedules)[0]]
  Object.keys(schedules).forEach((a) => {
    let crtab = schedules[a].crontab
    let sched = later.parse.cron(crtab)
    schedules[a].next = new Date(later.schedule(sched).next().getTime())
    if (nextSchedule.next < schedules[a].next) {
      nextSchedule = schedules[a]
    }
  })
  return nextSchedule
}

module.exports.play = (_G, configuration, mainCallback) => {
  console.log('currentSchedule: ' + getCurrentSchedule(configuration.schedules).eid + ' nextSchedule: ' + getNextSchedule(configuration.schedules).eid + ' at ' + getNextSchedule(configuration.schedules).next)
  playSchedule(_G, configuration, (err) => {
    if (err) { mainCallback(err) }
  })
}

function playSchedule (_G, configuration, mainCallback) {
  let currentSchedule = getCurrentSchedule(configuration.schedules)
  let nextSchedule = getNextSchedule(configuration.schedules)
  let now = new Date()
  console.log('current started ' + (now - currentSchedule.prev) + ' ago.')
  console.log('next starts in ' + (nextSchedule.next - now) + '.')
}
