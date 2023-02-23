export function datesDiffMs(a: Date, b: Date) {
  return Math.abs(a.getTime() - b.getTime());
}

export function msFrom(d: Date) {
  return datesDiffMs(new Date(), d);
}
