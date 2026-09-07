# Security & privacy model

Mobile Life Assistant handles personal data (your tasks and schedule) on-device and treats both
the **language model** and the **network** as untrusted.

## The AI boundary

> The AI proposes an ordering. Deterministic code validates it against the time window,
> reserves a travel buffer, and never lets you overrun.

The planner only returns a proposed order of task ids. The scheduler enforces the hard invariant
`usedMinutes + travelBuffer <= availableMinutes`, so a wrong or adversarial ordering can never
produce a plan that overruns your window. The evaluation includes an adversarial planner and
asserts 0 over-budget plans.

## Data minimization

Only the minimum context crosses the AI boundary. `minimize()` (`src/core/privacy.ts`) reduces a
task to exactly `{ id, title, minutes }`; timestamps, the device id, status, and the deleted
flag never leave the device, and completed/deleted tasks are excluded from planning entirely.
The allowed fields are a named constant and a test spies on the planner to prove it never
receives anything more.

## Local-first storage & delete-my-data

- Tasks live in a **local store** on the device; the app is fully usable offline.
- Every change is queued locally and only synced on an explicit reconnect.
- **`wipe()`** deletes all local data and the pending queue — the spec's "delete-data
  operation". On device this maps to clearing SQLite/secure storage.

A production build would additionally place sensitive fields in the platform secure store
(Keychain / Keystore) via `expo-secure-store`; the store is behind an interface so this is a
drop-in.

## Sync integrity

- Every task carries `version` / `updatedAt` / `deviceId`, and the **deterministic conflict
  resolver** guarantees all devices converge to the same state — a malformed or out-of-order
  peer update can't cause permanent divergence.
- Incoming tasks pass through `parseTask` validation at the boundary before they are trusted.
- `sync` is idempotent, so a retried or duplicated sync is harmless.

## What is out of scope

- This is a portfolio/reference implementation. The server is an in-memory mock; there is no
  authentication or transport security (a real build would use HTTPS + auth behind the same
  `SyncServer` interface).
- The default planner is a deterministic mock; a real model sits behind the `Planner` interface
  without changing the scheduler or the minimization boundary.
- Native secure-storage and permission prompts are described but not wired in the demo.

## Dependency advisories

`npm audit` reports transitive high/moderate advisories inside the Expo / React Navigation /
Metro toolchain. These are not in first-party code and have no upstream fix without breaking
major bumps; CI prints them for visibility and gates the build on **critical** advisories (of
which there are none).

## Reporting

This is a personal portfolio project. If you find a security issue, please open an issue
describing it.
