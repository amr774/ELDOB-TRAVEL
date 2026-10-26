/** Interpret a wall-clock time in Cairo, including Egypt daylight saving time. */
export function cairoDateTime(date: string, time: string) {
  const wall = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(wall)) throw new Error('Invalid date');
  let instant = wall;
  for (let i = 0; i < 3; i++) {
    const offset =
      new Intl.DateTimeFormat('en', {
        timeZone: 'Africa/Cairo',
        timeZoneName: 'longOffset',
      })
        .formatToParts(new Date(instant))
        .find((p) => p.type === 'timeZoneName')?.value || 'GMT+02:00';
    const match = offset.match(/GMT([+-])(\d{2}):(\d{2})/);
    const minutes = match
      ? (Number(match[2]) * 60 + Number(match[3])) * (match[1] === '+' ? 1 : -1)
      : 0;
    instant = wall - minutes * 60000;
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant));
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  if (
    `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}` !==
    `${date}T${time}`
  )
    throw new Error(
      'This time does not exist due to the daylight saving change. Choose another time.',
    );
  return new Date(instant).toISOString();
}
