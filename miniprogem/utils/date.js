function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function getDayStamp(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatClock(date) {
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${hour}:${minute}`;
}

export function parseDateInput(input) {
  if (input === undefined || input === null || input === "") {
    return null;
  }

  if (input instanceof Date) {
    return isValidDate(input) ? input : null;
  }

  if (typeof input === "number") {
    const date = new Date(input);
    return isValidDate(date) ? date : null;
  }

  if (typeof input !== "string") {
    return null;
  }

  const text = input.trim();
  if (!text) {
    return null;
  }

  const direct = new Date(text);
  if (isValidDate(direct)) {
    return direct;
  }

  const matched = text.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/
  );
  if (!matched) {
    return null;
  }

  const year = Number(matched[1]);
  const month = Number(matched[2]) - 1;
  const day = Number(matched[3]);
  const hour = Number(matched[4] || 0);
  const minute = Number(matched[5] || 0);
  const second = Number(matched[6] || 0);
  const date = new Date(year, month, day, hour, minute, second);

  return isValidDate(date) ? date : null;
}

export function getTimestamp(input) {
  const date = parseDateInput(input);
  return date ? date.getTime() : 0;
}

export function formatMonthDayTime(input) {
  const date = parseDateInput(input);
  if (!date) {
    return typeof input === "string" ? input : "";
  }

  const now = new Date();
  const dayDiff = Math.round((getDayStamp(date) - getDayStamp(now)) / 86400000);
  const timeText = formatClock(date);

  if (dayDiff === 0) {
    return `今天 ${timeText}`;
  }

  if (dayDiff === 1) {
    return `明天 ${timeText}`;
  }

  if (dayDiff === 2) {
    return `后天 ${timeText}`;
  }

  if (dayDiff === -1) {
    return `昨天 ${timeText}`;
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAYS[date.getDay()] || "";

  return `${year}年${month}月${day}日${weekday} ${timeText}`;
}
