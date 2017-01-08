'use strict';

// todo: caching of channel membership and user info - slack node sdk has some in memory store
// todo: anchor to beginning of line or space; and ending with space or punctuation or line end

const RtmClient = require('@slack/client').RtmClient;
  const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
  const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const WebClient = require('@slack/client').WebClient;
const Time = require('./time')

const token = process.env.SLACK_BOT_TOKEN || '';
const rtm = new RtmClient(token)
const web = new WebClient(token)

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
  console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}`)
})

rtm.on(RTM_EVENTS.MESSAGE, (message) => {
  const localTime = Time.parseTime(message.text)
  if (localTime === null) return

  web.channels.info(message.channel).then((channelResponse) => {
    const channel = channelResponse.channel

    var usersToLookup = channel.members.slice(0)
    if (!usersToLookup.includes(message.user)) {
      usersToLookup.push(message.user)
    }

    Promise.all(usersToLookup.map((each) => { return web.users.info(each) })).then((userResponses) => {
      const users = userResponses.map((response) => { return(response.user) })

      var targetZones = []
      var localZone

      users.forEach((user) => {
        if (user.is_bot === true) return

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
