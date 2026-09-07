/**
 * The deterministic scheduler: it takes the planner's *proposed* task order and decides what
 * actually fits in the available window, reserving a travel buffer at the end. This is the code
 * that enforces the rule the model can't: the sum of scheduled task minutes plus the buffer can
 * never exceed the minutes the user actually has. The planner suggests; the scheduler validates
 * and executes.
 *
 * Producing the spec's worked example ("I have 45 minutes before I leave"):
 *
 *   Task A         15 min
 *   Task B         10 min
 *   Prepare bag     8 min
 *   Travel buffer  12 min
 */

import type { PlannerTask } from "./llm";

/** How much of the window is reserved for leaving/travel, as a fraction, with a floor/cap. */
export interface BufferPolicy {
  readonly fraction: number; // e.g. 0.25 = reserve a quarter of the window
  readonly minMinutes: number;
  readonly maxMinutes: number;
}

export const DEFAULT_BUFFER: BufferPolicy = { fraction: 0.25, minMinutes: 5, maxMinutes: 20 };

export interface ScheduledItem {
  readonly id: string;
  readonly title: string;
  readonly minutes: number;
}

export interface Schedule {
  readonly items: readonly ScheduledItem[];
  readonly travelBuffer: number;
  readonly usedMinutes: number; // scheduled task minutes (excludes buffer)
  readonly availableMinutes: number;
  /** Tasks that were proposed but didn't fit. */
  readonly deferred: readonly ScheduledItem[];
}

/** Compute the travel buffer for a window under a policy (deterministic). */
export function travelBuffer(availableMinutes: number, policy: BufferPolicy = DEFAULT_BUFFER): number {
  const raw = Math.round(availableMinutes * policy.fraction);
  return Math.max(policy.minMinutes, Math.min(policy.maxMinutes, raw));
}

/**
 * Fit tasks into the window in the planner's proposed order, reserving the travel buffer. A
 * task is scheduled only if it fits in the remaining time; otherwise it is deferred. The result
 * is guaranteed to satisfy `usedMinutes + travelBuffer <= availableMinutes`.
 */
export function schedule(
  availableMinutes: number,
  proposedOrder: readonly PlannerTask[],
  policy: BufferPolicy = DEFAULT_BUFFER,
): Schedule {
  const buffer = travelBuffer(availableMinutes, policy);
  const budget = Math.max(0, availableMinutes - buffer);

  const items: ScheduledItem[] = [];
  const deferred: ScheduledItem[] = [];
  let used = 0;

  for (const t of proposedOrder) {
    const item: ScheduledItem = { id: t.id, title: t.title, minutes: t.minutes };
    if (used + t.minutes <= budget) {
      items.push(item);
      used += t.minutes;
    } else {
      deferred.push(item);
    }
  }

  return { items, travelBuffer: buffer, usedMinutes: used, availableMinutes, deferred };
}
