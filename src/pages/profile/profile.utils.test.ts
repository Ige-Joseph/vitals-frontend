import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { formatDate } from './profile.utils.ts'

const formatLocalDate = (date: Date) => date.toLocaleDateString(undefined, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

test('date-only calendar values do not shift in a timezone west of UTC', () => {
  const previousTimezone = process.env.TZ
  process.env.TZ = 'America/Los_Angeles'

  try {
    const localCalendarDate = formatLocalDate(new Date(2026, 7, 26))
    const utcParsedDate = formatLocalDate(new Date('2026-08-26'))

    assert.notEqual(localCalendarDate, utcParsedDate)
    assert.equal(formatDate('2026-08-26'), localCalendarDate)
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ
    else process.env.TZ = previousTimezone
  }
})

test('full timestamps continue to parse as instants', () => {
  const timestamp = '2026-08-26T00:30:00.000Z'

  assert.equal(formatDate(timestamp), formatLocalDate(new Date(timestamp)))
})
