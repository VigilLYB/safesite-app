/** Injectable time source: lint bans ambient `new Date()` / `Date.now()` everywhere else. */
export interface Clock {
  now(): Date;
  nowMs(): number;
}

export const systemClock: Clock = {
  now: () => new Date(),
  nowMs: () => Date.now(),
};

export let clock: Clock = systemClock;

/** Test seam. */
export function setClock(next: Clock): void {
  clock = next;
}
