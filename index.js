'use strict';

const RtmClient = require('@slack/client').RtmClient;
  const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
  const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const WebClient = require('@slack/client').WebClient;
const Time = require('./time')
const NodeCache = require( "node-cache" );

const token = process.env.SLACK_BOT_TOKEN || '';
const rtm = new RtmClient(token)
const web = new WebClient(token)

const channelCacheTTL = 1 * 60 * 60 // 1 hour, in seconds
const userCacheTTL = 4 * 60 * 60 // 4 hours, in seconds
const cache = new NodeCache({ stdTTL: 30*60, checkperiod: 15*60 });

function getChannelInfo(channelID) {
  const cached = cache.get(channelID)
  if (cached != undefined) {
    console.log(`Got cached info for channel ${channelID}`)
    return Promise.resolve(cached)
  } else {
    return web.channels.info(channelID).catch((error) => {
      if (error.message == 'channel_not_found') {
        console.log(`[DEBUG] ${channelID} may be a private channel; trying to look that up…`)
        return web.groups.info(channelID)
      } else {
        console.log(`Cannot recover from error looking up ${channelID}: ${error}`)
      }
    }).then((response) => {
      const channelInfo = response.channel != undefined ? response.channel : response.group
      cache.set(channelID, channelInfo, channelCacheTTL)
      return channelInfo
    })
  }
}

function getUserInfo(userID) {
  const cached = cache.get(userID)
  if (cached != undefined) {
    console.log(`Got cached info for user ${userID}`)
    return Promise.resolve(cached)
  } else {
    return web.users.info(userID).then((response) => {
      const userInfo = response.user
      cache.set(userID, userInfo, userCacheTTL)
      return userInfo
    })
  }
}

function pushUniqueZone(zones, zone) {
  if (zones.find((element, idx, array) => { return element.tz_label == zone.tz_label }) == undefined) {
    zones.push(zone)
  }
}

function removeZone(zones, zone) {
  const idx = zones.findIndex((element, idx, array) => { return element.tz_label == zone.tz_label })
  console.log(idx)
  if (idx > -1) {
    zones.splice(idx, 1)
  }
}

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
  console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}`)
})

rtm.on(RTM_EVENTS.MESSAGE, (message) => {
  const localTime = Time.parseTime(message.text)
  if (localTime === null) return

  console.log(`[DEBUG] Got message with time ${Time.formatTime(localTime)} in channel ${message.channel}`)

  getChannelInfo(message.channel).then((channel) => {
    var usersToLookup = channel.members.slice(0)
    if (!usersToLookup.includes(message.user)) {
      usersToLookup.push(message.user)
    }

    Promise.all(usersToLookup.map((userID) => { return getUserInfo(userID) })).then((users) => {
      var targetZones = []
      var localZone

      users.forEach((user) => {
        if (user.is_bot) return

        const userZone = {
          'tz_label': user.tz_label,
          'tz_offset': user.tz_offset
        }

        if (user.id == message.user) {
          localZone = userZone
        } else {
          pushUniqueZone(targetZones, userZone)
        }
      })

      removeZone(targetZones, localZone)

      targetZones.sort((a, b) => {
        return a.tz_offset - b.tz_offset
      })

      var reply = `*${Time.formatTime(localTime)}* in ${localZone.tz_label} is:`
      targetZones.forEach((zone) => {
        const offsetFromLocal = zone.tz_offset - localZone.tz_offset
        reply = reply + `\n${Time.formatTime(Time.applyOffsetToTime(localTime, offsetFromLocal))} in ${zone.tz_label}`
      })

      rtm.sendMessage(reply, message.channel)
    })
  })
})

rtm.start()
