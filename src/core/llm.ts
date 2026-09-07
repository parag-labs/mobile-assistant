/**
 * The AI planner abstraction - the only place a model runs. Given the minutes available and the
 * candidate tasks, it *proposes* an ordering (which tasks to do, in what order). It never
 * decides what actually fits; the deterministic scheduler (schedule.ts) validates the proposal
 * against the time window and reserves a travel buffer. A real model drops in behind this
 * interface; the default is a deterministic mock so the demo needs no API key.
 *
 * Privacy: the planner is only ever given a *minimized* view of each task (see minimize()), not
 * the full record - the spec's "only send necessary context to the AI service".
 */

/** The minimal task shape the planner is allowed to see. No timestamps, device ids, or status. */
export interface PlannerTask {
  readonly id: string;
  readonly title: string;
  readonly minutes: number;
}

export interface PlannerRequest {
  readonly availableMinutes: number;
  readonly tasks: readonly PlannerTask[];
}

export interface PlannerResponse {
  /** Proposed ordering of task ids. The scheduler decides which actually fit. */
  readonly order: readonly string[];
  readonly tokens: number;
}

export interface Planner {
  propose(req: PlannerRequest): Promise<PlannerResponse>;
}

/**
 * A deterministic mock planner. It proposes tasks shortest-first, which greedily maximizes how
 * many fit in a window - a sensible default the scheduler then validates. Being a pure function
 * of its input keeps plans reproducible.
 */
export class MockPlanner implements Planner {
  async propose(req: PlannerRequest): Promise<PlannerResponse> {
    const order = [...req.tasks]
      .sort((a, b) => a.minutes - b.minutes || a.id.localeCompare(b.id))
      .map((t) => t.id);
    const tokens = 8 + req.tasks.length * 3;
    return { order, tokens };
  }
}

/** A planner returning a fixed order - for targeted tests (e.g. a deliberately bad ordering). */
export class ScriptedPlanner implements Planner {
  constructor(private readonly order: readonly string[], private readonly tokens = 10) {}
  async propose(): Promise<PlannerResponse> {
    return { order: this.order, tokens: this.tokens };
  }
}
