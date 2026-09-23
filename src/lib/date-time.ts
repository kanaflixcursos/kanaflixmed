const datePart = /^\d{4}-\d{2}-\d{2}$/;
const timePart = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function zonedParts(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function localDateTimeToUtc(date: string, time: string, timezone: string) {
  if (!datePart.test(date) || !timePart.test(time)) throw new Error("INVALID_LOCAL_DATETIME");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let instant = desired;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = zonedParts(new Date(instant), timezone);
    const represented = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second),
    );
    const difference = represented - instant;
    if (difference === 0) break;
    instant = desired - difference;
  }

  const actual = zonedParts(new Date(instant), timezone);
  if (`${actual.year}-${actual.month}-${actual.day}` !== date || `${actual.hour}:${actual.minute}` !== time) {
    throw new Error("INVALID_LOCAL_DATETIME");
  }
  return new Date(instant).toISOString();
}

export function localDateToUtc(date: string, timezone: string) {
  return localDateTimeToUtc(date, "00:00", timezone);
}

export function addLocalDays(date: string, days: number) {
  if (!datePart.test(date)) throw new Error("INVALID_DATE");
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function clinicToday(timezone: string, now = new Date()) {
  const parts = zonedParts(now, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getLocalDateBounds(date: string, timezone: string) {
  const nextDate = addLocalDays(date, 1);
  return {
    start: localDateToUtc(date, timezone),
    end: localDateToUtc(nextDate, timezone),
  };
}

export function formatInTimezone(value: string, timezone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: timezone }).format(new Date(value));
}
