/**
 * Privacy: data minimization. Before any task is handed to the AI planner it is stripped to the
 * three fields the planner needs - id, title, minutes. Timestamps, the device id, status, and
 * the deleted flag never leave the device boundary. This is the spec's "only send necessary
 * context to the AI service", enforced in code rather than by convention.
 */

import type { PlannerTask } from "./llm";
import type { Task } from "./task";

/** Reduce a full task to the minimal shape the planner is allowed to see. */
export function minimize(task: Task): PlannerTask {
  return { id: String(task.id), title: task.title, minutes: task.minutes };
}

/** Minimize a list of tasks, dropping deleted and completed ones (not needed for planning). */
export function minimizeForPlanning(tasks: readonly Task[]): PlannerTask[] {
  return tasks.filter((t) => !t.deleted && t.status === "todo").map(minimize);
}

/** The exact set of fields that are permitted to cross the AI boundary. */
export const ALLOWED_AI_FIELDS = ["id", "title", "minutes"] as const;

/** Assert an object only contains allowed fields - used by the privacy test. */
export function containsOnlyAllowedFields(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).every((k) => (ALLOWED_AI_FIELDS as readonly string[]).includes(k));
}
