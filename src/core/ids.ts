/**
 * Branded id types and a deterministic id/clock helper. A task id can't be confused with a
 * device id even though both are strings at runtime.
 */

declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

export type TaskId = Brand<string, "TaskId">;
export type DeviceId = Brand<string, "DeviceId">;

export const TaskId = (s: string): TaskId => s as TaskId;
export const DeviceId = (s: string): DeviceId => s as DeviceId;

export function makeCounter(prefix: string): () => string {
  let n = 0;
  return () => `${prefix}_${++n}`;
}
