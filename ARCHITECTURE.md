# Architecture

Mobile Life Assistant has two halves separated by a hard boundary:

1. **A pure-TypeScript core** (`src/core/`) with no React Native or Expo imports — the task
   model, conflict resolver, local store, sync engine, planner abstraction, privacy
   minimization, scheduler, and the planning orchestrator. This is the tested core.
2. **A thin Expo Router UI** (`app/`) that renders the core's state and calls into it. It runs
   natively on device and, via `react-native-web`, as the static web demo.

## The core rule

> The AI proposes an ordering. Deterministic code validates it against the time window,
> reserves a travel buffer, and never lets you overrun.

The planner (`llm.ts`) is the only place a model runs, and it only returns a *proposed order* of
task ids. The scheduler (`schedule.ts`) decides what actually fits and always reserves a travel
buffer, enforcing the invariant `usedMinutes + travelBuffer <= availableMinutes` — something the
model cannot violate.

## Planning lifecycle

```
"I have N minutes" + tasks
    ↓
minimizeForPlanning()          # privacy: only id/title/minutes reach the planner
    ↓
Planner.propose()              # LLM (or MockPlanner) — proposes an order
    ↓  (token budget checked)
schedule()                     # deterministic: fit in order, reserve travel buffer
    ↓
verify usedMinutes + buffer <= window   # hard invariant; failure aborts
    ↓
PlanCompleted (planned | empty | failed)
```

Every step emits a typed event.

## Offline-first data flow

The device is the source of truth while offline:

- **`LocalStore`** holds tasks and a **sync queue**. Every local write (`create` / `edit` /
  `remove`) bumps the task's `version`, stamps `updatedAt` and `deviceId`, and enqueues an op.
  `remove` is a soft delete so deletions sync like any other change.
- **`sync(local, server)`** pushes the queued tasks, pulls the server's reconciled state, merges
  it into the local store, and clears the queue. It is order-independent and idempotent.
- **`MemoryServer`** is a deterministic in-memory stand-in; a real backend implements the same
  `SyncServer` interface (`pull` / `push`) behind an HTTP client.

## Conflict resolution

`resolve(a, b)` in `conflict.ts` is a **total order** over three fields:

| Level | Field | Rule |
|-------|-------|------|
| 1 | `version` | higher wins |
| 2 | `updatedAt` | later wins (on version tie) |
| 3 | `deviceId` | lexicographically smaller wins (on full tie) |

The third level guarantees determinism: two genuinely simultaneous edits resolve to the same
winner on every device, so the stores converge instead of diverging. `mergeLists` applies this
to whole lists and reports which ids were in real conflict. The design decision is documented in
the source and in the README, as the spec requires.

## Privacy by construction

`minimize()` reduces a full `Task` to `{ id, title, minutes }` before it reaches the planner,
and `minimizeForPlanning()` also drops completed and deleted tasks. The set of allowed fields is
a named constant (`ALLOWED_AI_FIELDS`), and a test spies on the planner to assert nothing else
ever crosses the boundary. `LocalStore.wipe()` is the "delete my data" operation.

## Why the core is framework-free

Keeping every rule in `src/core` with no RN imports means:

- it is unit-testable with plain Vitest (32 tests) in a Node environment;
- it runs identically on iOS, Android, and the web export;
- the eval numbers are deterministic and committable (injected clock, pure mock planner).

The Expo layer only holds React state and renders — it contains no business logic.

## Web export & deployment

`app.config.js` sets Expo's web output to a **static** bundle and, when `PAGES=1`, sets
`experiments.baseUrl` to `/mobile-assistant` so the export works under the GitHub Pages subpath.
`npx expo export --platform web` produces `dist/`, which the Pages workflow uploads. Because the
whole assistant runs client-side, the static export is a complete, working demo.
