const LOS_ANGELES_TIME_ZONE = "America/Los_Angeles";

export function formatPacificDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: LOS_ANGELES_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short"
  }).format(new Date(value));
}
