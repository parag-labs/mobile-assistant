/**
 * The conflict resolver: the deterministic heart of offline-first sync. When the same task was
 * edited on two devices while offline, we must pick a single winner *reproducibly* - the same
 * two versions must always resolve the same way, on every device, with no coordination.
 *
 * The strategy (documented, as the spec asks) is a three-level total order:
 *
 *   1. version      - higher monotonic version wins (more edits on top of a common base);
 *   2. updatedAt    - if versions tie, the later wall-clock write wins (last-writer-wins);
 *   3. deviceId     - if both tie, the lexicographically smaller device id wins.
 *
 * Level 3 is the crucial one: it makes the resolution *total* and deterministic. Without a
 * final tiebreak, two truly-simultaneous edits could resolve differently on different devices
 * and the stores would diverge forever. deviceId is arbitrary but stable and globally unique,
 * so every device computes the same winner. The outcome never depends on which side you call
 * "local" or "remote".
 */

import type { Task } from "./task";

export type Winner = "a" | "b";

export interface Resolution {
  readonly winner: Winner;
  readonly task: Task;
  /** Why this side won - useful for the sync log and debugging. */
  readonly reason: "version" | "updatedAt" | "deviceId" | "equal";
  /** True when the two inputs were genuinely in conflict (a real divergence), not identical. */
  readonly conflicted: boolean;
}

/** Resolve two versions of the same task id into a single deterministic winner. */
export function resolve(a: Task, b: Task): Resolution {
  if (String(a.id) !== String(b.id)) throw new Error("cannot resolve two different tasks");

  if (a.version !== b.version) {
    const winner = a.version > b.version ? "a" : "b";
    return { winner, task: winner === "a" ? a : b, reason: "version", conflicted: true };
  }

  if (a.updatedAt !== b.updatedAt) {
    const winner = a.updatedAt > b.updatedAt ? "a" : "b";
    return { winner, task: winner === "a" ? a : b, reason: "updatedAt", conflicted: true };
  }

  if (String(a.deviceId) !== String(b.deviceId)) {
    const winner = String(a.deviceId) < String(b.deviceId) ? "a" : "b";
    return { winner, task: winner === "a" ? a : b, reason: "deviceId", conflicted: true };
  }

  // Same version, timestamp and device: the records are effectively identical.
  return { winner: "a", task: a, reason: "equal", conflicted: false };
}

/**
 * Merge two full task lists (e.g. local and server) into one reconciled list, resolving every
 * id-collision with `resolve`. The result is deterministic regardless of argument order, and
 * reports which ids were genuinely in conflict.
 */
export interface MergeResult {
  readonly tasks: Task[];
  readonly conflicts: string[];
}

export function mergeLists(a: readonly Task[], b: readonly Task[]): MergeResult {
  const byId = new Map<string, Task>();
  const conflicts = new Set<string>();

  for (const t of a) byId.set(String(t.id), t);
  for (const t of b) {
    const existing = byId.get(String(t.id));
    if (!existing) {
      byId.set(String(t.id), t);
      continue;
    }
    const r = resolve(existing, t);
    byId.set(String(t.id), r.task);
    if (r.conflicted) conflicts.add(String(t.id));
  }

  const tasks = [...byId.values()].sort((x, y) => String(x.id).localeCompare(String(y.id)));
  return { tasks, conflicts: [...conflicts].sort() };
}
