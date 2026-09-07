import { describe, expect, it } from "vitest";
import { schedule, travelBuffer, DEFAULT_BUFFER } from "../schedule";
import type { PlannerTask } from "../llm";

const tasks: PlannerTask[] = [
  { id: "a", title: "Task A", minutes: 15 },
  { id: "b", title: "Task B", minutes: 10 },
  { id: "bag", title: "Prepare bag", minutes: 8 },
  { id: "long", title: "Deep work", minutes: 40 },
];

describe("scheduler", () => {
  it("reserves a travel buffer within the policy bounds", () => {
    expect(travelBuffer(45)).toBe(11); // round(45*0.25)=11, within [5,20]
    expect(travelBuffer(8)).toBe(5); // floored to min
    expect(travelBuffer(200)).toBe(20); // capped to max
  });

  it("fits tasks into the window and reserves the buffer (45-minute example)", () => {
    const s = schedule(45, tasks);
    // buffer 11, budget 34; A(15)+B(10)+bag(8)=33 fits, deep work(40) deferred
    expect(s.items.map((i) => i.id)).toEqual(["a", "b", "bag"]);
    expect(s.deferred.map((i) => i.id)).toEqual(["long"]);
    expect(s.travelBuffer).toBe(11);
    expect(s.usedMinutes).toBe(33);
  });

  it("never exceeds the window (the hard invariant)", () => {
    for (const minutes of [10, 20, 45, 60, 90]) {
      const s = schedule(minutes, tasks);
      expect(s.usedMinutes + s.travelBuffer).toBeLessThanOrEqual(minutes);
    }
  });

  it("defers everything when the window is too small", () => {
    const s = schedule(10, tasks, DEFAULT_BUFFER);
    // buffer 5, budget 5; nothing fits except... none (min task is 8)
    expect(s.items).toHaveLength(0);
    expect(s.deferred.length).toBe(tasks.length);
  });
});
