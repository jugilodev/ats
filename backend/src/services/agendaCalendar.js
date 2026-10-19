const bogotaTimezone = "America/Bogota";

const partsFor = (date, options) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: bogotaTimezone,
    ...options,
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
};

export const getBogotaDateTime = (date = new Date()) => {
  const parts = partsFor(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
};

export const addDays = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const mondayOnOrAfter = (dateString) => {
  const date = new Date(`${dateString}T00:00:00Z`);
  const daysUntilMonday = (8 - date.getUTCDay()) % 7;
  return addDays(dateString, daysUntilMonday);
};

const easterSunday = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const observedMondayHoliday = (year, month, day) => {
  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return mondayOnOrAfter(date);
};

export const colombianHolidays = (year) => {
  const holidays = new Set([
    `${year}-01-01`,
    `${year}-05-01`,
    `${year}-07-20`,
    `${year}-08-07`,
    `${year}-12-08`,
    `${year}-12-25`,
  ]);

  for (const [month, day] of [
    [1, 6],
    [3, 19],
    [6, 29],
    [8, 15],
    [10, 12],
    [11, 1],
    [11, 11],
  ]) {
    holidays.add(observedMondayHoliday(year, month, day));
  }

  const easter = easterSunday(year);
  for (const offset of [-3, -2]) {
    holidays.add(addDays(easter, offset));
  }
  for (const offset of [39, 60, 68]) {
    holidays.add(mondayOnOrAfter(addDays(easter, offset)));
  }

  return holidays;
};

export const isColombianBusinessDay = (dateString) => {
  const date = new Date(`${dateString}T00:00:00Z`);
  const weekday = date.getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return !colombianHolidays(date.getUTCFullYear()).has(dateString);
};
