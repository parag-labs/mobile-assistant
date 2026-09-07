# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-07

First public release.

### Added
- Pure-TypeScript assistant core (`src/core`), framework-free and fully unit-tested:
  - Task model with sync metadata (`version` / `updatedAt` / `deviceId`) and a boundary
    validator.
  - Deterministic, totally-ordered conflict resolver (version → updatedAt → deviceId) with
    order-independent list merge, and its rationale documented in source and README.
  - Offline-first `LocalStore` with a sync queue, soft deletes, and a data-wipe operation.
  - Bidirectional `sync` engine + in-memory `MemoryServer`; convergent and idempotent.
  - `Planner` abstraction (deterministic `MockPlanner` / `ScriptedPlanner`).
  - Privacy minimization: only `id`/`title`/`minutes` cross the AI boundary.
  - Deterministic scheduler that fits tasks to the window and reserves a travel buffer, with a
    never-exceed-window invariant.
  - Event-sourced planning orchestrator, evaluation harness, and `npm run eval` CLI (0
    over-budget plans across all scenarios).
- Expo Router app (`app/`): a planner screen ("I have N minutes"), offline task CRUD with
  version display, an online/offline sync simulation, and a delete-my-data action.
- 32 Vitest tests across conflict resolution, offline sync, scheduling, planning, and privacy.
- Static web export (runs client-side) deployed to GitHub Pages, Docker (nginx) build, and
  GitHub Actions CI (lint / typecheck / test / eval / web export, plus a dependency scan that
  gates on critical advisories), and full docs.

[0.1.0]: https://github.com/parag-labs/mobile-assistant/releases/tag/v0.1.0
