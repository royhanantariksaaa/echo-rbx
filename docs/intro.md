---
sidebar_position: 1
slug: /intro
---

# Echo

Echo is a small typed Luau signal library for Roblox. It provides asynchronous
dispatch, stable connection handles, idempotent teardown, and lowercase APIs
with complete PascalCase compatibility aliases.

## Why Echo

- **Small surface:** one constructor, one signal type, and one connection type.
- **Safe handles:** disconnected connections are never recycled into unrelated
  subscriptions.
- **Predictable dispatch:** each listener runs independently through Roblox's
  task scheduler.
- **Churn-friendly storage:** connect and disconnect are constant-time.

Start with [Getting Started](getting-started), then read
[Signals and Connections](signals) for exact dispatch behavior.

:::info Part of a stack
Echo is standalone. Weave uses the same lifecycle ideas for reactive UI, while
Flite uses Echo for local framework signals and state observation.
:::
