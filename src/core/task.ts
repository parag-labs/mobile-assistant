/**
 * The task domain model. A task is a small, serializable record designed for offline-first
 * sync: it carries a monotonic `version`, an `updatedAt` timestamp, and the `deviceId` that
 * last wrote it. Those three fields are exactly what the deterministic conflict resolver uses.
 * Every task also validates through a Zod-free, hand-rolled schema so untrusted input (from
 * storage or a peer) can't inject a malformed record.
 */

import type { DeviceId, TaskId } from "./ids";

export type TaskStatus = "todo" | "done";

export interface Task {
  readonly id: TaskId;
  readonly title: string;
  /** Estimated minutes to complete - drives the time-window planner. */
  readonly minutes: number;
  readonly status: TaskStatus;
  /** True for a soft delete, so deletions sync like any other change. */
  readonly deleted: boolean;
  // --- sync metadata ---
  readonly version: number;
  readonly updatedAt: number;
  readonly deviceId: DeviceId;
}

/** A partial change a user makes to a task (the fields they can edit). */
export interface TaskPatch {
  readonly title?: string;
  readonly minutes?: number;
  readonly status?: TaskStatus;
  readonly deleted?: boolean;
}

/** Validate an unknown value as a Task. Returns the typed task or throws with a reason. */
export function parseTask(raw: unknown): Task {
  if (typeof raw !== "object" || raw === null) throw new Error("task must be an object");
  const r = raw as Record<string, unknown>;
  const str = (k: string): string => {
    if (typeof r[k] !== "string" || (r[k] as string).length === 0) throw new Error(`task.${k} must be a non-empty string`);
    return r[k] as string;
  };
  const num = (k: string): number => {
    if (typeof r[k] !== "number" || !Number.isFinite(r[k])) throw new Error(`task.${k} must be a number`);
    return r[k] as number;
  };
  const bool = (k: string): boolean => {
    if (typeof r[k] !== "boolean") throw new Error(`task.${k} must be a boolean`);
    return r[k] as boolean;
  };
  const status = str("status");
  if (status !== "todo" && status !== "done") throw new Error(`task.status must be 'todo' or 'done'`);
  const minutes = num("minutes");
  if (minutes < 0) throw new Error("task.minutes must be >= 0");

  return {
    id: str("id") as TaskId,
    title: str("title"),
    minutes,
    status,
    deleted: bool("deleted"),
    version: num("version"),
    updatedAt: num("updatedAt"),
    deviceId: str("deviceId") as DeviceId,
  };
}
