'use strict';

var exports = module.exports = {};

exports.parseTime = function(_message) {
  const timeRE = /\b(\d?\d):(\d\d) ?([apAP][mM]?)?\b|\b(1?\d)([apAP][mM]?)\b/
  const matches = timeRE.exec(_message)

  if (matches == null) return null

  var hours = parseInt(matches[1] != undefined ? matches[1] : matches[4])
  var minutes = parseInt(matches[2])
  var ampm = matches[3] != undefined ? matches[3] : matches[5]

  if (isNaN(hours)) return null
  if (hours > 23) return null
  if ((hours == 0 || hours > 12) && ampm != undefined) return null

  if (ampm == undefined) {
    if ((hours >= 8 && hours < 12) || hours == 0) {
      ampm = "am"
    } else {
      ampm = "pm"
    }
  }

  const first = ampm.substring(0, 1)
  if ((first == 'p' || first == 'P') && hours != 12) hours += 12
  if ((first == 'a' || first == 'A') && hours == 12) hours = 0

  while (hours > 23) hours -= 12
  if (isNaN(minutes)) minutes = 0

  return [hours, minutes]
}

exports.applyOffsetToTime = function(_time, _offset) {
  var time = _time.slice(0)
  var delta_minutes = _offset/60

  while (delta_minutes > 0) {
    time[1]++
    delta_minutes--

    exports.fixTime(time)
  }

  while (delta_minutes < 0) {
    time[1]--
    delta_minutes++

    exports.fixTime(time)
  }

  return time
}

exports.formatTime = function(_time) {
  var time = _time.slice(0)
  const ampm = time[0] < 12 ? 'a.m.' : 'p.m.'

  if (time[0] > 12) {
    time[0] = time[0] - 12
  } else if (time[0] == 0) {
    time[0] = 12
  }

  return `${time[0]}:${pad(time[1], 2)} ${ampm}`
}

exports.fixTime = function(time) {
  while (time[1] > 59) {
    time[1] -= 60
    time[0]++
  }

  while (time[1] < 0) {
    time[1] += 60
    time[0]--
  }

  while (time[0] > 23) {
    time[0] -= 24
  }

  while (time[0] < 0) {
    time[0] += 24
  }

  return time
}

function pad(num, size) {
  var s = num+'';
  while (s.length < size) s = '0' + s;
  return s;
}
