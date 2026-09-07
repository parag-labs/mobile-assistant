import { describe, expect, it } from "vitest";
import { parseTask } from "../task";
import { makeTask } from "../examples";

describe("task validation", () => {
  it("parses a valid task", () => {
    const t = makeTask("t1", "A", 10);
    const parsed = parseTask({ ...t });
    expect(String(parsed.id)).toBe("t1");
    expect(parsed.minutes).toBe(10);
  });

  it("rejects malformed input at the boundary", () => {
    expect(() => parseTask(null)).toThrow(/object/);
    expect(() => parseTask({ id: "", title: "x", minutes: 1, status: "todo", deleted: false, version: 1, updatedAt: 0, deviceId: "d" })).toThrow(/id/);
    expect(() => parseTask({ id: "t", title: "x", minutes: -1, status: "todo", deleted: false, version: 1, updatedAt: 0, deviceId: "d" })).toThrow(/minutes/);
    expect(() => parseTask({ id: "t", title: "x", minutes: 1, status: "maybe", deleted: false, version: 1, updatedAt: 0, deviceId: "d" })).toThrow(/status/);
  });
});
