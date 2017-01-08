'use strict';

// todo: improve names
// todo: cleanup time.js impl
// todo: refactor with promises and compact closure syntax

// todo: handle case where user who sent the message is not a member of the channel (specifically look up their TZ too)
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

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
  console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}`)
})

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  const time = Time.parseTime(message.text)
  if (time === null) { return }

  web.channels.info(message.channel, function(err, res) {
    if (err) {
      console.log('Error:', err)
    } else {
      const channel = res.channel

      Promise.all(channel.members.map(function(each) { return web.users.info(each) }))
      .then(function(responses) {
        const users = responses.map(function(response) { return(response.user) })

        var zonesForTranslation = []
        var originalZone

        users.forEach(function(user) {
          if (user.is_bot === true) { return }

          const userTimezone = {
            "tz_label": user.tz_label,
            "tz_offset": user.tz_offset
          }

          if (user.id == message.user) {
            originalZone = userTimezone
          } else if (!zonesForTranslation.includes(userTimezone)) {
            zonesForTranslation.push(userTimezone)
          }
        })

        zonesForTranslation.sort(function(a, b) {
          return a.tz_offset - b.tz_offset
        })

        var reply = `*${Time.formatTime(time)}* in ${originalZone.tz_label} is:`
        zonesForTranslation.forEach(function(zone) {
          const offsetFromOriginal = zone.tz_offset - originalZone.tz_offset
          reply = reply + `\n${Time.formatTime(Time.applyOffsetToTime(time, offsetFromOriginal))} in ${zone.tz_label}`
        })

        rtm.sendMessage(reply, message.channel)
      })
    }
  })

})

rtm.start()
