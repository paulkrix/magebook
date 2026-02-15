const SYDNEY_TIME_ZONE = "Australia/Sydney";

export function formatSydneyDateTime(value: Date | string | number): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: SYDNEY_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(new Date(value));
}

export function formatSydneyDate(value: Date | string | number): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: SYDNEY_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(value));
}
