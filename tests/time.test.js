'use strict';

const Time = require('../time')

describe('timeOfDay parsing', () => {
  const sut = Time.parseTime

  it('parses complete times with am/pm', () => {
    expect(sut('2:00am')).toEqual([2, 0])
    expect(sut('11:12am')).toEqual([11, 12])
    expect(sut('11:12pm')).toEqual([23, 12])
  })

  it('parses complete times with a/p', () => {
    expect(sut('11:10a')).toEqual([11, 10])
    expect(sut('11:10p')).toEqual([23, 10])
  })

  it('parses hour-only times with am/pm', () => {
    expect(sut('3pm')).toEqual([15, 0])
  })

  it('does not parse hour-only times with a/p', () => {
    expect(sut('11a')).toBeNull()
    expect(sut('11P')).toBeNull()
  })

  it('parses uppercase am/pm', () => {
    expect(sut('11:12AM')).toEqual([11, 12])
    expect(sut('11:12PM')).toEqual([23, 12])
    expect(sut('11:10A')).toEqual([11, 10])
    expect(sut('11:10P')).toEqual([23, 10])
  })

  it ('parses a space between time and am/pm', () => {
    expect(sut('4:12 a')).toEqual([4, 12])
    expect(sut('4:12 P')).toEqual([16, 12])
  })

  it('parses noon and midnight', () => {
    expect(sut('0:05')).toEqual([0, 5])
    expect(sut('12:05')).toEqual([12, 5])
    expect(sut('12:05am')).toEqual([0, 5])
    expect(sut('12:05P')).toEqual([12, 5])
  })

  it('parses times between 8:00 and 11:59 as AM if unspecified', () => {
    expect(sut('8:00')).toEqual([8, 0])
    expect(sut('10:30')).toEqual([10, 30])
    expect(sut('11:59')).toEqual([11, 59])
  })

  it ('parses times between noon and 7:59 as PM if unspecified', () => {
    expect(sut('3:00')).toEqual([15, 0])
    expect(sut('12:00')).toEqual([12, 0])
    expect(sut('7:59')).toEqual([19, 59])
  })

  it('parses 24-hour times', () => {
    expect(sut('15:00')).toEqual([15, 0])
    expect(sut('22:30')).toEqual([22, 30])
    expect(sut('0:05')).toEqual([0, 5])
  })

  it('returns null for invalid input', () => {
    expect(sut('1')).toBeNull()
    expect(sut('pm')).toBeNull()
    expect(sut('A')).toBeNull()
    expect(sut('11:pm')).toBeNull()
    expect(sut('3: am')).toBeNull()
  })

  it('returns null for garbage input', () => {
    expect(sut('123')).toBeNull()
    expect(sut('abc')).toBeNull()
  })

  it('returns null for 24h times with am/pm attached', () => {
    expect(sut('0:30am')).toBeNull()
    expect(sut('22:30pm')).toBeNull()
    expect(sut('18:00am')).toBeNull()
  })

  it('returns null for invalid 24h times', () => {
    expect(sut('26:30')).toBeNull()
    expect(sut('24:00')).toBeNull()
  })

  it('returns null for things that look like times but are out of range', () => {
    expect(sut('30:00')).toBeNull()
  })

  it('parses time-looking things at beginning of a sentence', () => {
    expect(sut('1:30pm is the appointment')).toEqual([13, 30])
  })

  it('parses time-looking things at end of a sentence', () => {
    expect(sut('the appointment is 1:30pm')).toEqual([13, 30])
  })

  it('parses time-looking things in the middle of a sentence', () => {
    expect(sut('I made a 1:30pm appointment')).toEqual([13, 30])
  })

  it("doesn't parse time-looking things inside other strings", () => {
    expect(sut('xyzzy1:30')).toBeNull()
    expect(sut('221:30')).toBeNull()
    expect(sut('1:30xyzzy')).toBeNull()
    expect(sut('at1:30xyzzy')).toBeNull()
  })
})

describe('applyOffsetToTime', () => {
  const sut = Time.applyOffsetToTime

  const sixHourPositiveOffset = 21600
  const threeHourNegativeOffset = -10800

  it('applies positive offsets', () => {
    expect(sut([3, 30], sixHourPositiveOffset)).toEqual([9, 30])
  })

  it('applies positive offsets across noon', () => {
    expect(sut([9, 30], sixHourPositiveOffset)).toEqual([15, 30])
  })

  it('applies positive offsets across midnight', () => {
    expect(sut([21, 30], sixHourPositiveOffset)).toEqual([3, 30])
  })

  it('applies negative offsets', () => {
    expect(sut([4, 30], threeHourNegativeOffset)).toEqual([1, 30])
  })

  it('applies negative offsets across noon', () => {
    expect(sut([14, 30], threeHourNegativeOffset)).toEqual([11, 30])
  })

  it('applies negative offsets across midnight', () => {
    expect(sut([1, 30], threeHourNegativeOffset)).toEqual([22, 30])
  })

  it('does not modify the value passed in', () => {
    const a = [3, 30]
    const b = sut(a, 120)
    expect(b).not.toBe(a)
    expect(b).not.toEqual(a)
  })
})

describe('formatTime', () => {
  const sut = Time.formatTime

  it('formats midnight times', () => {
    expect(sut([0, 30])).toEqual('12:30 a.m.')
  })

  it('formats noon times', () => {
    expect(sut([12, 30])).toEqual('12:30 p.m.')
  })

  it('formats morning times', () => {
    expect(sut([10, 30])).toEqual('10:30 a.m.')
  })

  it('formats afternoon times', () => {
    expect(sut([17, 30])).toEqual('5:30 p.m.')
  })

  it('pads minutes to 2 digits', () => {
    expect(sut([20, 8])).toEqual('8:08 p.m.')
    expect(sut([20, 0])).toEqual('8:00 p.m.')
  })

  it('does not modify the value passed in', () => {
    const a = [15, 30]
    const result = sut(a)
    expect(a).toEqual([15, 30])
  })
})

describe('fixTime', () => {
  const sut = Time.fixTime

  it('rolls minutes over to add an hour', () => {
    expect(sut([5, 60])).toEqual([6, 0])
    expect(sut([5, 61])).toEqual([6, 1])
  })

  it('rolls minutes under to subtract an hour', () => {
    expect(sut([5, -1])).toEqual([4, 59])
    expect(sut([5, -2])).toEqual([4, 58])
  })

  it('rolls hours over from PM to AM', () => {
    expect(sut([23, 60])).toEqual([0, 0])
    expect(sut([23, 61])).toEqual([0, 1])
  })

  it('rolls hours under from AM to PM', () => {
    expect(sut([0, -1])).toEqual([23, 59])
    expect(sut([0, -2])).toEqual([23, 58])
  })

  it('preserves valid times', () => {
    expect(sut([0, 0])).toEqual([0, 0])
    expect(sut([1, 30])).toEqual([1, 30])
    expect(sut([12, 0])).toEqual([12, 0])
    expect(sut([18, 30])).toEqual([18, 30])
    expect(sut([23, 30])).toEqual([23, 30])
    expect(sut([23, 59])).toEqual([23, 59])
  })

  it('modifies the array passed in', () => {
    const a = [5, 60]
    const b = sut(a)
    expect(b).toBe(a)
    expect(b).toEqual(a)
  })
})
