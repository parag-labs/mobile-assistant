import { describe, expect, it } from "vitest";
import { plan } from "../orchestrator";
import { MockPlanner, ScriptedPlanner } from "../llm";
import { sampleTasks } from "../examples";

const clock = () => 0;

describe("planning orchestrator", () => {
  it("produces the worked example: A, B, prepare bag + travel buffer in 45 min", async () => {
    const result = await plan({ availableMinutes: 45, tasks: sampleTasks }, { planner: new MockPlanner(), clock });
    expect(result.status).toBe("planned");
    const titles = result.schedule!.items.map((i) => i.title);
    expect(titles).toContain("Task A");
    expect(titles).toContain("Task B");
    expect(titles).toContain("Prepare bag");
    expect(result.schedule!.travelBuffer).toBeGreaterThan(0);
  });

  it("never overflows the window even with an adversarial planner order", async () => {
    // Biggest task first - the scheduler must still keep the plan within the window.
    const adversarial = new ScriptedPlanner(["t_long", "t_a", "t_b", "t_bag"]);
    const result = await plan({ availableMinutes: 45, tasks: sampleTasks }, { planner: adversarial, clock });
    expect(result.status).toBe("planned");
    const s = result.schedule!;
    expect(s.usedMinutes + s.travelBuffer).toBeLessThanOrEqual(45);
  });

  it("emits an ordered event log with a minimization step", async () => {
    const result = await plan({ availableMinutes: 45, tasks: sampleTasks }, { planner: new MockPlanner(), clock });
    const types = result.events.map((e) => e.event.type);
    expect(types[0]).toBe("PlanStarted");
    expect(types).toContain("ContextMinimized");
    expect(types).toContain("TravelBufferReserved");
    expect(types.at(-1)).toBe("PlanCompleted");
    result.events.forEach((e, i) => expect(e.seq).toBe(i));
  });

  it("returns empty when there are no plannable tasks", async () => {
    const result = await plan({ availableMinutes: 45, tasks: [] }, { planner: new MockPlanner(), clock });
    expect(result.status).toBe("empty");
    expect(result.schedule).toBeUndefined();
  });

  it("fails safely when the token budget is exceeded", async () => {
    const result = await plan(
      { availableMinutes: 45, tasks: sampleTasks },
      { planner: new MockPlanner(), clock, tokenBudget: 1 },
    );
    expect(result.status).toBe("failed");
    expect(result.error).toContain("token budget");
  });
});
