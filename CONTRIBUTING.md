# Contributing

Thanks for taking a look. This is a personal portfolio project, but it follows the workflow
I'd use on a team.

## Setup

```bash
npm install
npm run web      # or `npm start` for native
```

Requirements: Node 20+. No API keys and no backend — the default planner is a deterministic mock
and the store/server are in-memory.

## Before you push

CI runs exactly these; the build job must be green:

```bash
npm run lint
npm run typecheck
npm test
npm run build    # expo export --platform web
```

## Ground rules

- **The core stays framework-free.** Nothing in `src/core/` may import React, React Native, or
  Expo. The dependency arrow points UI → core only. That is what keeps the core unit-testable
  and identical across platforms.
- **Keep the core rule intact.** The planner proposes an order; the scheduler validates it
  against the window and reserves a travel buffer. Never let planner output bypass the
  `usedMinutes + buffer <= window` invariant.
- **Respect the privacy boundary.** Only `id`/`title`/`minutes` may reach the planner. If you
  add a field, do not add it to `ALLOWED_AI_FIELDS` unless it is genuinely required.
- **Determinism.** Use the injected clock — no `Math.random()` or bare `Date.now()` in core
  logic a test can't control. The mock planner and conflict resolver must stay pure.
- **Never fabricate eval numbers.** The README table is produced by `npm run eval`. If behavior
  changes, re-run it and paste the real output.
- **Types over comments.** Prefer making an invalid state unrepresentable (branded ids, the task
  model, the planner interface) to documenting that it shouldn't happen.

## Commit style

Small, focused commits with imperative subjects. One concern per commit.
