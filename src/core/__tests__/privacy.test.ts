import { describe, expect, it } from "vitest";
import { minimize, minimizeForPlanning, containsOnlyAllowedFields, ALLOWED_AI_FIELDS } from "../privacy";
import { plan } from "../orchestrator";
import { makeTask, sampleTasks } from "../examples";

describe("privacy: data minimization", () => {
  it("strips a task to only id, title, minutes", () => {
    const t = makeTask("t1", "Secret meeting", 30, { deviceId: undefined as never, updatedAt: 123 });
    const m = minimize(t);
    expect(Object.keys(m).sort()).toEqual([...ALLOWED_AI_FIELDS].sort());
    expect(containsOnlyAllowedFields(m as unknown as Record<string, unknown>)).toBe(true);
  });

  it("never leaks device id, timestamps, or status to the planner", () => {
    const minimized = minimizeForPlanning(sampleTasks);
    for (const m of minimized) {
      const keys = Object.keys(m);
      expect(keys).not.toContain("deviceId");
      expect(keys).not.toContain("updatedAt");
      expect(keys).not.toContain("version");
      expect(keys).not.toContain("status");
      expect(keys).not.toContain("deleted");
    }
  });

  it("excludes completed and deleted tasks from planning", () => {
    const tasks = [
      makeTask("t1", "todo task", 10),
      makeTask("t2", "done task", 10, { status: "done" }),
      makeTask("t3", "deleted task", 10, { deleted: true }),
    ];
    const m = minimizeForPlanning(tasks);
    expect(m.map((x) => x.id)).toEqual(["t1"]);
  });

  it("the planner in a real run only ever receives allowed fields", async () => {
    // Spy planner that captures exactly what it is handed.
    let seenKeys: string[] = [];
    const spy = {
      async propose(req: { tasks: readonly Record<string, unknown>[] }) {
        seenKeys = req.tasks.flatMap((t) => Object.keys(t));
        return { order: req.tasks.map((t) => String(t.id)), tokens: 5 };
      },
    };
    await plan({ availableMinutes: 45, tasks: sampleTasks }, { planner: spy as never, clock: () => 0 });
    for (const k of seenKeys) {
      expect((ALLOWED_AI_FIELDS as readonly string[]).includes(k)).toBe(true);
    }
  });
});
