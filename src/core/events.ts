/**
 * The typed event model for a planning run, so the flow (minimize → propose → schedule →
 * verify) is observable and the UI can show each step. Events are plain serializable records.
 */

export type PlanStatus = "planned" | "empty" | "failed";

export type PlanEvent =
  | { readonly type: "PlanStarted"; readonly availableMinutes: number; readonly taskCount: number }
  | { readonly type: "ContextMinimized"; readonly sentFields: readonly string[]; readonly taskCount: number }
  | { readonly type: "OrderProposed"; readonly order: readonly string[]; readonly tokens: number }
  | { readonly type: "TravelBufferReserved"; readonly minutes: number }
  | { readonly type: "TaskScheduled"; readonly id: string; readonly title: string; readonly minutes: number }
  | { readonly type: "TaskDeferred"; readonly id: string; readonly title: string; readonly minutes: number }
  | { readonly type: "PlanVerified"; readonly usedMinutes: number; readonly withinWindow: boolean }
  | { readonly type: "PlanCompleted"; readonly status: PlanStatus }
  | { readonly type: "PlanFailed"; readonly error: string };

export type PlanEventType = PlanEvent["type"];

export interface LoggedEvent {
  readonly seq: number;
  readonly at: number;
  readonly event: PlanEvent;
}

export class EventLog {
  private readonly events: LoggedEvent[] = [];
  private seq = 0;

  constructor(private readonly clock: () => number = () => Date.now(), private readonly onAppend?: (e: LoggedEvent) => void) {}

  append(event: PlanEvent): LoggedEvent {
    const logged: LoggedEvent = { seq: this.seq++, at: this.clock(), event };
    this.events.push(logged);
    this.onAppend?.(logged);
    return logged;
  }

  all(): readonly LoggedEvent[] {
    return this.events;
  }
}
