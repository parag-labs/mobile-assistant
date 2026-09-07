/**
 * `pnpm eval` / `npm run eval` entry point. Runs the evaluation scenarios and prints a table of
 * metrics derived from real runs - never hand-typed. The README copies these numbers verbatim.
 */

import { evaluate } from "./evaluate";

async function main(): Promise<void> {
  const rows = await evaluate();

  console.log("\nMobile Life Assistant Evaluation (metrics from actual runs)\n");
  const header = ["scenario", "status", "scheduled", "deferred", "used min", "buffer", "over-budget", "tokens"];
  const widths = [22, 10, 11, 10, 10, 8, 13, 7];
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i] ?? 10)).join("");

  console.log(line(header));
  for (const r of rows) {
    console.log(
      line([
        r.name,
        r.status,
        String(r.scheduled),
        String(r.deferred),
        String(r.usedMinutes),
        String(r.travelBuffer),
        String(r.overBudget),
        String(r.tokens),
      ]),
    );
  }

  const totalOver = rows.reduce((a, r) => a + r.overBudget, 0);
  console.log(`\nOver-budget plans across all scenarios: ${totalOver}`);
  if (totalOver > 0) {
    console.error("FAIL: a plan exceeded its time window");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
