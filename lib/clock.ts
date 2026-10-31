export const timeZoneKey = "eventiq-time-zone";
export function validTimeZone(value: string | null): string {
  if (!value || value === "system") return "system";
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return value;
  } catch {
    return "system";
  }
}
export function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
export function zoneLabel(zone: string) {
  if (zone === "UTC") return "UTC";
  if (zone === "Asia/Calcutta" || zone === "Asia/Kolkata") return "Kolkata";
  return zone.split("/").at(-1)!.replaceAll("_", " ");
}
export function availableTimeZones(device: string) {
  let supported: string[] = [];
  try {
    supported = Intl.supportedValuesOf("timeZone");
  } catch {
    /* Use the common-zone list on older browsers. */
  }
  return [
    ...new Set([
      "UTC",
      "Asia/Kolkata",
      "Asia/Dubai",
      "Asia/Singapore",
      "Europe/London",
      "Europe/Paris",
      "America/New_York",
      "America/Los_Angeles",
      "Australia/Sydney",
      device,
      ...supported,
    ]),
  ].sort();
}
export function clockFormatters(zone: string) {
  return {
    time: new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }),
    date: new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      weekday: "short",
      day: "numeric",
      month: "short",
    }),
    fullDate: new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      dateStyle: "full",
    }),
    offset: new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    }),
  };
}
export function clockDisplay(
  now: Date,
  formatters: ReturnType<typeof clockFormatters>,
) {
  return {
    time: formatters.time.format(now),
    date: formatters.date.format(now),
    fullDate: formatters.fullDate.format(now),
    offset: formatters.offset
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName")!
      .value.replace(/^GMT/, "UTC"),
  };
}
