/**
 * Deterministic Icelandic number formatting.
 *
 * `Number.prototype.toLocaleString("is-IS")` depends on the ICU data of
 * whatever runtime it executes in, so Node and the browser can disagree on the
 * thousands separator. That difference shows up as a React hydration mismatch,
 * and — because these numbers land in aria-labels and in an aria-live region —
 * it also means a screen reader could announce a price that differs from the
 * one the server rendered. Formatting explicitly removes both problems.
 */
export function isk(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  const digits = Math.abs(rounded).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
