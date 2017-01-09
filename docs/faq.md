# timebot FAQ

## How does it work?

Timebot monitors new messages posted to the channels you’ve invited it to. When it sees something that looks like a time (like “3pm”, “9:30”, “4pm”, or “18:00”), it:

1. Assumes that represents a time in the local timezone of the message’s sender.
2. If “am/pm” is missing, and it’s not a 24-hour time, it assumes that times between “8:00” and “11:59” are “am” times, and times from “12:00” to “7:59” are “pm” times. This lines up with anecdotal experience in my work Slack.
3. It then lists the time zones for everyone else in the channel, and calculates the _current_ offset between their local time zone and the sender’s time zone.
4. Those offsets are used to translate the time for others in the channel.

## It’s giving a response that includes a time zone we didn’t expect, or the response doesn’t include a time zone we did expect.

- Be sure that everyone in the channel has set the correct time zone in their Slack profile.
- Channel membership information is cached for an hour. If someone in a new time zone just joined (or left) a channel, timebot thus might not notice for an hour. Restarting timebot will clear that cache.

## Do I have to host the bot on a server that’s publicly accessible?

Strictly speaking, no. The bot uses Slack’s real time messaging API, which is built on websockets, so your server doesn’t need to be publicly accessible.

(But if you run it on a laptop, the bot will go offline every time the laptop closes.)

## Does it parse time zones attached to times, like “1:00pm EST”?

No, not currently.

## What time formats does it parse?

See [the tests](https://github.com/cdzombak/timebot/blob/master/tests/time.test.js#L5).
