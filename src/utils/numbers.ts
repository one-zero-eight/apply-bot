/**
 * Returns a number whose value is limited to the given range.
 *
 * @param {Number} min Lower boundary of the output range
 * @param {Number} max Upper boundary of the output range
 * @returns Number in the range [min, max]
 */
export function clamp(min: number, val: number, max: number) {
  return Math.min(Math.max(val, min), max);
}
