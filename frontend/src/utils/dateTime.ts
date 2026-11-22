const boliviaDateTime = new Intl.DateTimeFormat("es-BO", {
  timeZone: "America/La_Paz",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function displayDateTime(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(value)) {
    return value;
  }
  // Los timestamps sin desplazamiento del esquema representan hora de Bolivia.
  const timestamp = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value)
    ? value
    : `${value.replace(" ", "T")}-04:00`;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? value : boliviaDateTime.format(date);
}
