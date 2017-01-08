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
    return new Promise((resolve, reject) => {
      resolve(cached)
    })
  } else {
    return web.channels.info(channelID).then((response) => {
      const channelInfo = response.channel
      cache.set(channelID, channelInfo, channelCacheTTL)
      return channelInfo
    })
  }
}

function getUserInfo(userID) {
  const cached = cache.get(userID)
  if (cached != undefined) {
    console.log(`Got cached info for user ${userID}`)
    return new Promise((resolve, reject) => {
      resolve(cached)
    })
  } else {
    return web.users.info(userID).then((response) => {
      const userInfo = response.user
      cache.set(userID, userInfo, userCacheTTL)
      return userInfo
    })
  }
}

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
  console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}`)
})

rtm.on(RTM_EVENTS.MESSAGE, (message) => {
  const localTime = Time.parseTime(message.text)
  if (localTime === null) return

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
        } else if (!targetZones.includes(userZone)) {
          targetZones.push(userZone)
        }
      })

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
