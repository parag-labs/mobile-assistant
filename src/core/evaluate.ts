/**
 * The evaluation harness. It runs repeatable scenarios and derives metrics purely from real
 * runs, so nothing is hand-authored. The headline safety metric is `overBudget`: plans whose
 * scheduled work plus travel buffer exceed the window. It must always be zero - the whole point
 * of the deterministic scheduler is that the model can never make you miss your window.
 */

import { plan, type PlanResult } from "./orchestrator";
import { MockPlanner, ScriptedPlanner } from "./llm";
import { AVAILABLE_MINUTES, sampleTasks } from "./examples";

export interface ScenarioMetrics {
  readonly name: string;
  readonly status: PlanResult["status"];
  readonly scheduled: number;
  readonly deferred: number;
  readonly usedMinutes: number;
  readonly travelBuffer: number;
  readonly overBudget: number; // must be 0
  readonly tokens: number;
}

function metricsFrom(name: string, availableMinutes: number, result: PlanResult): ScenarioMetrics {
  const s = result.schedule;
  const over = s && s.usedMinutes + s.travelBuffer > availableMinutes ? 1 : 0;
  return {
    name,
    status: result.status,
    scheduled: s?.items.length ?? 0,
    deferred: s?.deferred.length ?? 0,
    usedMinutes: s?.usedMinutes ?? 0,
    travelBuffer: s?.travelBuffer ?? 0,
    overBudget: over,
    tokens: result.tokens,
  };
}

export async function evaluate(): Promise<ScenarioMetrics[]> {
  const planner = new MockPlanner();
  const clock = () => 0;

  // A deliberately adversarial planner that puts the biggest task first - the scheduler must
  // still never overflow the window.
  const adversarial = new ScriptedPlanner(["t_long", "t_a", "t_b", "t_bag"]);

  const rows: ScenarioMetrics[] = [
    metricsFrom("45 min (mock)", 45, await plan({ availableMinutes: 45, tasks: sampleTasks }, { planner, clock })),
    metricsFrom("20 min (tight)", 20, await plan({ availableMinutes: 20, tasks: sampleTasks }, { planner, clock })),
    metricsFrom("45 min (adversarial)", 45, await plan({ availableMinutes: 45, tasks: sampleTasks }, { planner: adversarial, clock })),
  ];
  void AVAILABLE_MINUTES;
  return rows;
}
