/**
 * The local store abstraction. On a device this is backed by SQLite/AsyncStorage; in tests,
 * the demo, and the web export it is a deterministic in-memory map. The engine only depends on
 * this interface, so the offline behaviour is identical everywhere and fully unit-testable.
 *
 * Writes go through `upsert`, which bumps the version and stamps updatedAt/deviceId - the
 * metadata the conflict resolver relies on. Every local write also enqueues a sync operation so
 * it can be replayed to the server on reconnect.
 */

import { resolve } from "./conflict";
import type { DeviceId, TaskId } from "./ids";
import type { Task, TaskPatch, TaskStatus } from "./task";

export interface PendingOp {
  readonly taskId: TaskId;
  readonly version: number;
  readonly at: number;
}

/** An in-memory task store with a pending-sync queue. Deterministic given an injected clock. */
export class LocalStore {
  private readonly tasks = new Map<string, Task>();
  private readonly queue: PendingOp[] = [];

  constructor(
    private readonly deviceId: DeviceId,
    private readonly clock: () => number = () => Date.now(),
  ) {}

  /** Create a new task locally (offline-safe). */
  create(id: TaskId, title: string, minutes: number, status: TaskStatus = "todo"): Task {
    const task: Task = {
      id,
      title,
      minutes,
      status,
      deleted: false,
      version: 1,
      updatedAt: this.clock(),
      deviceId: this.deviceId,
    };
    this.tasks.set(String(id), task);
    this.enqueue(task);
    return task;
  }

  /** Apply a user edit locally: bumps version, restamps metadata, enqueues for sync. */
  edit(id: TaskId, patch: TaskPatch): Task {
    const current = this.tasks.get(String(id));
    if (!current) throw new Error(`unknown task: ${id}`);
    const next: Task = {
      ...current,
      ...patch,
      version: current.version + 1,
      updatedAt: this.clock(),
      deviceId: this.deviceId,
    };
    this.tasks.set(String(id), next);
    this.enqueue(next);
    return next;
  }

  /** Soft-delete a task (deletions sync like any other change). */
  remove(id: TaskId): Task {
    return this.edit(id, { deleted: true });
  }

  get(id: TaskId): Task | undefined {
    return this.tasks.get(String(id));
  }

  /** All non-deleted tasks (what the UI shows), sorted by id for stable rendering. */
  list(): Task[] {
    return [...this.tasks.values()].filter((t) => !t.deleted).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }

  /** Every task including soft-deleted ones - used for sync. */
  allIncludingDeleted(): Task[] {
    return [...this.tasks.values()];
  }

  /** The pending sync queue (operations not yet acknowledged by the server). */
  pending(): readonly PendingOp[] {
    return this.queue;
  }

  /** Replace the store's contents (e.g. after a merge with the server). Does not enqueue. */
  replaceAll(tasks: readonly Task[]): void {
    this.tasks.clear();
    for (const t of tasks) this.tasks.set(String(t.id), t);
  }

  /** Merge an incoming task deterministically without enqueuing (server → local). */
  applyRemote(task: Task): Task {
    const existing = this.tasks.get(String(task.id));
    const winner = existing ? resolve(existing, task).task : task;
    this.tasks.set(String(task.id), winner);
    return winner;
  }

  /** Clear the pending queue up to the given length (after a successful push). */
  clearPending(): void {
    this.queue.length = 0;
  }

  /** Delete all data for this device - the privacy "delete my data" operation. */
  wipe(): void {
    this.tasks.clear();
    this.queue.length = 0;
  }

  private enqueue(task: Task): void {
    this.queue.push({ taskId: task.id, version: task.version, at: task.updatedAt });
  }
}
