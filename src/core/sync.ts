/**
 * The sync engine. It reconciles a device's local store with a (mock) server store on
 * reconnect, following the spec's pipeline: local changes → sync queue → conflict detection →
 * server. Both directions use the same deterministic conflict resolver, so after a sync both
 * sides converge to the identical task set no matter who was offline or for how long.
 *
 * The server here is an in-memory stand-in so the whole flow is testable and runs client-side;
 * a real implementation would put an HTTP client behind the same `SyncServer` interface.
 */

import { mergeLists } from "./conflict";
import type { LocalStore } from "./store";
import type { Task } from "./task";

/** The minimal server contract the sync engine needs. */
export interface SyncServer {
  /** Return every task the server currently holds. */
  pull(): Task[];
  /** Merge the pushed tasks into the server, returning the reconciled server state. */
  push(tasks: readonly Task[]): Task[];
}

/** A deterministic in-memory server for the demo, tests, and web export. */
export class MemoryServer implements SyncServer {
  private readonly tasks = new Map<string, Task>();

  pull(): Task[] {
    return [...this.tasks.values()];
  }

  push(incoming: readonly Task[]): Task[] {
    const merged = mergeLists([...this.tasks.values()], incoming);
    this.tasks.clear();
    for (const t of merged.tasks) this.tasks.set(String(t.id), t);
    return merged.tasks;
  }
}

export interface SyncResult {
  /** The reconciled task set both sides now hold. */
  readonly tasks: Task[];
  /** Ids that were genuinely in conflict and had to be resolved. */
  readonly conflicts: string[];
  readonly pushed: number;
  readonly pulled: number;
}

/**
 * Run a full bidirectional sync: push the local (including soft-deleted) tasks to the server,
 * pull the reconciled server state, merge it into the local store, and clear the queue. The
 * result is order-independent and idempotent - running it twice with no new edits is a no-op.
 */
export function sync(local: LocalStore, server: SyncServer): SyncResult {
  const localTasks = local.allIncludingDeleted();
  const pushed = localTasks.length;

  // Push local → server; the server reconciles with its own state.
  const serverState = server.push(localTasks);

  // Pull the reconciled server state back and merge into local.
  const pulled = serverState.length;
  const merged = mergeLists(localTasks, serverState);
  local.replaceAll(merged.tasks);
  local.clearPending();

  return { tasks: merged.tasks, conflicts: merged.conflicts, pushed, pulled };
}
