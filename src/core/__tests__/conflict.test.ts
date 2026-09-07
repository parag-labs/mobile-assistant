import { describe, expect, it } from "vitest";
import { resolve, mergeLists } from "../conflict";
import { makeTask, DEVICE_A, DEVICE_B } from "../examples";

describe("conflict resolution", () => {
  it("higher version wins", () => {
    const a = makeTask("t", "A", 10, { version: 3 });
    const b = makeTask("t", "B", 10, { version: 2 });
    const r = resolve(a, b);
    expect(r.winner).toBe("a");
    expect(r.reason).toBe("version");
    expect(r.conflicted).toBe(true);
  });

  it("on equal version, later updatedAt wins", () => {
    const a = makeTask("t", "A", 10, { version: 2, updatedAt: 100 });
    const b = makeTask("t", "B", 10, { version: 2, updatedAt: 200 });
    const r = resolve(a, b);
    expect(r.winner).toBe("b");
    expect(r.reason).toBe("updatedAt");
  });

  it("on equal version and time, smaller deviceId wins (total order)", () => {
    const a = makeTask("t", "A", 10, { version: 2, updatedAt: 100, deviceId: DEVICE_A });
    const b = makeTask("t", "B", 10, { version: 2, updatedAt: 100, deviceId: DEVICE_B });
    const r = resolve(a, b);
    expect(r.winner).toBe("a"); // "device-a" < "device-b"
    expect(r.reason).toBe("deviceId");
  });

  it("is order-independent: resolve(a,b) and resolve(b,a) pick the same task", () => {
    const a = makeTask("t", "A", 10, { version: 2, updatedAt: 100, deviceId: DEVICE_A });
    const b = makeTask("t", "B", 10, { version: 2, updatedAt: 100, deviceId: DEVICE_B });
    expect(String(resolve(a, b).task.deviceId)).toBe(String(resolve(b, a).task.deviceId));
  });

  it("identical records are not counted as a conflict", () => {
    const a = makeTask("t", "A", 10, { version: 2, updatedAt: 100, deviceId: DEVICE_A });
    const r = resolve(a, { ...a });
    expect(r.conflicted).toBe(false);
    expect(r.reason).toBe("equal");
  });

  it("refuses to resolve two different task ids", () => {
    expect(() => resolve(makeTask("x", "X", 1), makeTask("y", "Y", 1))).toThrow(/different tasks/);
  });

  it("mergeLists reconciles and reports conflicts deterministically", () => {
    const local = [makeTask("t1", "local", 10, { version: 2 }), makeTask("t2", "only-local", 5)];
    const server = [makeTask("t1", "server", 10, { version: 3 }), makeTask("t3", "only-server", 7)];
    const m1 = mergeLists(local, server);
    const m2 = mergeLists(server, local);
    expect(m1.tasks).toEqual(m2.tasks); // order-independent
    expect(m1.conflicts).toEqual(["t1"]);
    // t1 resolves to the higher-version server copy
    expect(m1.tasks.find((t) => String(t.id) === "t1")?.title).toBe("server");
    expect(m1.tasks).toHaveLength(3);
  });
});
