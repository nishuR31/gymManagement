export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function addMinutes(date: Date, minutes: number): Date {
  const copy = new Date(date);
  copy.setUTCMinutes(copy.getUTCMinutes() + minutes);
  return copy;
}
