/**
 * Example data shared by the tests, the evaluation harness, and the UI demo, so there is one
 * source of truth. The tasks are chosen to reproduce the spec's worked example in a 45-minute
 * window (Task A 15, Task B 10, Prepare bag 8, plus a reserved travel buffer).
 */

import { DeviceId, TaskId } from "./ids";
import type { Task } from "./task";

export const DEVICE_A = DeviceId("device-a");
export const DEVICE_B = DeviceId("device-b");

/** Build a fully-formed task (test/demo helper). */
export function makeTask(id: string, title: string, minutes: number, extra: Partial<Task> = {}): Task {
  return {
    id: TaskId(id),
    title,
    minutes,
    status: "todo",
    deleted: false,
    version: 1,
    updatedAt: 0,
    deviceId: DEVICE_A,
    ...extra,
  };
}

export const sampleTasks: Task[] = [
  makeTask("t_a", "Task A", 15),
  makeTask("t_b", "Task B", 10),
  makeTask("t_bag", "Prepare bag", 8),
  makeTask("t_long", "Deep work block", 40),
];

export const AVAILABLE_MINUTES = 45;
