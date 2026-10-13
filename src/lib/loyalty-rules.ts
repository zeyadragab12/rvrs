/** Stamps to collect. The order after that is free. */
export const STAMPS_NEEDED = 10;

/**
 * One stamp per completed order. A full cycle is STAMPS_NEEDED stamps plus the free order,
 * so completed % (STAMPS_NEEDED + 1) is the stamp count on the current card. Once the free
 * order completes the count wraps to zero, so no separate "claimed" state is stored.
 */
export function stampsFor(completed: number) {
  const stamps = completed % (STAMPS_NEEDED + 1);
  return { stamps, ready: stamps === STAMPS_NEEDED, remaining: STAMPS_NEEDED - stamps };
}
