import { describe, expect, it } from "vitest";
import { LocalStore } from "../store";
import { MemoryServer, sync } from "../sync";
import { DeviceId, TaskId } from "../ids";

function detClock() {
  let t = 0;
  return () => ++t;
}

describe("local store (offline)", () => {
  it("creates, edits, and soft-deletes tasks, bumping version each time", () => {
    const s = new LocalStore(DeviceId("dev1"), detClock());
    const t = s.create(TaskId("t1"), "Write tests", 20);
    expect(t.version).toBe(1);
    const e = s.edit(TaskId("t1"), { minutes: 25 });
    expect(e.version).toBe(2);
    expect(e.minutes).toBe(25);
    s.remove(TaskId("t1"));
    expect(s.get(TaskId("t1"))?.deleted).toBe(true);
    expect(s.list()).toHaveLength(0); // deleted tasks are hidden from the list
  });

  it("queues every local write for sync", () => {
    const s = new LocalStore(DeviceId("dev1"), detClock());
    s.create(TaskId("t1"), "A", 10);
    s.edit(TaskId("t1"), { minutes: 12 });
    expect(s.pending()).toHaveLength(2);
  });

  it("wipe() deletes all data (privacy delete-my-data)", () => {
    const s = new LocalStore(DeviceId("dev1"), detClock());
    s.create(TaskId("t1"), "A", 10);
    s.wipe();
    expect(s.list()).toHaveLength(0);
    expect(s.pending()).toHaveLength(0);
  });
});

describe("sync engine", () => {
  it("pushes local tasks to the server and clears the queue", () => {
    const local = new LocalStore(DeviceId("dev1"), detClock());
    const server = new MemoryServer();
    local.create(TaskId("t1"), "A", 10);
    local.create(TaskId("t2"), "B", 5);
    const r = sync(local, server);
    expect(r.pushed).toBe(2);
    expect(local.pending()).toHaveLength(0);
    expect(server.pull()).toHaveLength(2);
  });

  it("converges two devices to the same task set after both sync", () => {
    const server = new MemoryServer();
    const a = new LocalStore(DeviceId("device-a"), detClock());
    const b = new LocalStore(DeviceId("device-b"), detClock());

    a.create(TaskId("shared"), "from A", 10);
    b.create(TaskId("shared"), "from B", 20); // same id edited on both while offline
    a.create(TaskId("only-a"), "A only", 5);

    sync(a, server);
    sync(b, server);
    sync(a, server); // a pulls b's reconciled changes

    expect(a.allIncludingDeleted().map((t) => String(t.id)).sort()).toEqual(
      b.allIncludingDeleted().map((t) => String(t.id)).sort(),
    );
    // the "shared" task resolves to one deterministic winner on both devices
    expect(a.get(TaskId("shared"))?.title).toBe(b.get(TaskId("shared"))?.title);
  });

  it("is idempotent: syncing twice with no new edits is a no-op", () => {
    const local = new LocalStore(DeviceId("dev1"), detClock());
    const server = new MemoryServer();
    local.create(TaskId("t1"), "A", 10);
    const first = sync(local, server);
    const second = sync(local, server);
    expect(second.tasks).toEqual(first.tasks);
    expect(second.conflicts).toHaveLength(0);
  });

  it("propagates a soft-deletion through sync", () => {
    const server = new MemoryServer();
    const a = new LocalStore(DeviceId("device-a"), detClock());
    const b = new LocalStore(DeviceId("device-b"), detClock());
    a.create(TaskId("t1"), "A", 10);
    sync(a, server);
    sync(b, server); // b now has t1
    a.remove(TaskId("t1"));
    sync(a, server);
    sync(b, server); // b pulls the deletion
    expect(b.get(TaskId("t1"))?.deleted).toBe(true);
    expect(b.list()).toHaveLength(0);
  });
});
