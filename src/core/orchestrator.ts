/**
 * The planning orchestrator: turns "I have N minutes" plus the user's tasks into a validated
 * schedule, step by step. It minimizes the task context (privacy), asks the planner to *propose*
 * an order, then runs the deterministic scheduler to decide what fits and reserve a travel
 * buffer, and finally verifies the invariant that nothing overflows the window.
 *
 * The rule the whole design enforces: the AI proposes an ordering; deterministic code validates
 * against the time window and executes.
 */

import { EventLog, type LoggedEvent, type PlanStatus } from "./events";
import { ALLOWED_AI_FIELDS, minimizeForPlanning } from "./privacy";
import { DEFAULT_BUFFER, schedule, type BufferPolicy, type Schedule } from "./schedule";
import type { Planner } from "./llm";
import type { Task } from "./task";

export interface PlanRequest {
  readonly availableMinutes: number;
  readonly tasks: readonly Task[];
}

export interface PlanOptions {
  readonly planner: Planner;
  readonly clock?: () => number;
  readonly buffer?: BufferPolicy;
  readonly tokenBudget?: number;
  readonly onEvent?: (e: LoggedEvent) => void;
}

export interface PlanResult {
  readonly status: PlanStatus;
  readonly schedule: Schedule | undefined;
  readonly events: readonly LoggedEvent[];
  readonly tokens: number;
  readonly error?: string;
}

const DEFAULT_TOKEN_BUDGET = 500;

/** Produce a validated schedule for the available window. */
export async function plan(request: PlanRequest, opts: PlanOptions): Promise<PlanResult> {
  const clock = opts.clock ?? (() => Date.now());
  const buffer = opts.buffer ?? DEFAULT_BUFFER;
  const tokenBudget = opts.tokenBudget ?? DEFAULT_TOKEN_BUDGET;
  const log = new EventLog(clock, opts.onEvent);

  log.append({ type: "PlanStarted", availableMinutes: request.availableMinutes, taskCount: request.tasks.length });

  try {
    // Privacy: only id/title/minutes ever reach the planner.
    const minimized = minimizeForPlanning(request.tasks);
    log.append({ type: "ContextMinimized", sentFields: ALLOWED_AI_FIELDS, taskCount: minimized.length });

    if (minimized.length === 0) {
      log.append({ type: "PlanCompleted", status: "empty" });
      return { status: "empty", schedule: undefined, events: log.all(), tokens: 0 };
    }

    const { order, tokens } = await opts.planner.propose({ availableMinutes: request.availableMinutes, tasks: minimized });
    if (tokens > tokenBudget) throw new Error(`token budget exceeded: ${tokens} > ${tokenBudget}`);
    log.append({ type: "OrderProposed", order, tokens });

    // Reorder the minimized tasks by the planner's proposal (ignoring unknown ids).
    const byId = new Map(minimized.map((t) => [t.id, t]));
    const ordered = order.flatMap((id) => {
      const t = byId.get(id);
      return t ? [t] : [];
    });
    // Any task the planner forgot is appended so it is still considered.
    for (const t of minimized) if (!order.includes(t.id)) ordered.push(t);

    const result = schedule(request.availableMinutes, ordered, buffer);
    log.append({ type: "TravelBufferReserved", minutes: result.travelBuffer });
    for (const item of result.items) log.append({ type: "TaskScheduled", id: item.id, title: item.title, minutes: item.minutes });
    for (const item of result.deferred) log.append({ type: "TaskDeferred", id: item.id, title: item.title, minutes: item.minutes });

    // Verify the hard invariant: scheduled work + buffer never exceeds the window.
    const withinWindow = result.usedMinutes + result.travelBuffer <= request.availableMinutes;
    log.append({ type: "PlanVerified", usedMinutes: result.usedMinutes, withinWindow });
    if (!withinWindow) throw new Error("scheduler produced an over-budget plan");

    log.append({ type: "PlanCompleted", status: "planned" });
    return { status: "planned", schedule: result, events: log.all(), tokens };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log.append({ type: "PlanFailed", error });
    return { status: "failed", schedule: undefined, events: log.all(), tokens: 0, error };
  }
}
