import { describe, expect, it } from "vitest";
import { evaluate } from "../evaluate";

describe("evaluation harness", () => {
  it("produces zero over-budget plans across every scenario", async () => {
    const rows = await evaluate();
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.overBudget).toBe(0);
    }
  });

  it("is deterministic and repeatable", async () => {
    expect(await evaluate()).toEqual(await evaluate());
  });

  it("schedules fewer tasks in a tight window than a generous one", async () => {
    const rows = await evaluate();
    const wide = rows.find((r) => r.name === "45 min (mock)")!;
    const tight = rows.find((r) => r.name === "20 min (tight)")!;
    expect(tight.scheduled).toBeLessThan(wide.scheduled);
  });
});
