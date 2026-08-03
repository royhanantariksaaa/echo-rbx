---
title: API Map
description: Choose the Echo root, Signal, or Connection reference and review the behavioral contracts shared by every method.
---

# Echo API Map

<div className="lesson-header">
  <p className="lesson-kicker"><span className="streamline-icon streamline-icon--code" aria-hidden="true"></span> Reference / Start here</p>
  <p className="lesson-summary">Use this page to choose the right reference surface. The generated pages hold exact signatures; the guide pages explain how those signatures behave together.</p>
</div>

## Choose a surface

<div className="reference-switchboard">
  <a href="/echo-rbx/api/Echo/"><span className="streamline-icon streamline-icon--identity" aria-hidden="true"></span><span><strong>Echo</strong><br/><small>Create a typed signal from the root module.</small></span><span>1 factory</span></a>
  <a href="/echo-rbx/api/Signal/"><span className="streamline-icon streamline-icon--code" aria-hidden="true"></span><span><strong>Signal</strong><br/><small>Subscribe, fire, wait, clear, and release.</small></span><span>6 methods</span></a>
  <a href="/echo-rbx/api/Connection/"><span className="streamline-icon streamline-icon--check" aria-hidden="true"></span><span><strong>Connection</strong><br/><small>Inspect and end one stable subscription.</small></span><span>1 method + state</span></a>
</div>

## Root factory

| API | Returns | Contract |
|---|---|---|
| `Echo.new<T...>()` | `Echo.Signal<T...>` | Creates an empty reusable signal with a shared variadic argument pack. |

```lua
type Rewarded = Echo.Signal<Player, string, number>

local rewarded: Rewarded = Echo.new()
```

The type pack checks the callback parameters of `connect`, `once`, and `wait`
against every `fire` call using the same signal.

## Signal surface

| Primary | Alias | Returns | Important behavior |
|---|---|---|---|
| `connect(callback)` | `Connect` | `Connection` | Appends a persistent listener in O(1). |
| `once(callback)` | `Once` | `Connection` | Disconnects itself before invoking user code. |
| `wait()` | `Wait` | fired arguments | Yields the current yieldable thread for one fire. |
| `fire(...)` | `Fire` | nothing | Schedules current listeners and returns without waiting. |
| `disconnectAll()` | `DisconnectAll` | nothing | Clears current listeners but leaves the signal reusable. |
| `destroy()` | `Destroy` | nothing | Clears current listeners and communicates terminal ownership. |

## Connection surface

| Member | Type | Contract |
|---|---|---|
| `connected` | `boolean` | `true` while the subscription is in the signal list. |
| `disconnect()` | method | Removes this subscription in O(1); safe to call repeatedly. |
| `Disconnect()` | alias | PascalCase compatibility for `disconnect`. |

Public handles are not recycled. A stale disconnected handle cannot mutate a
listener that was connected later.

## Behavioral contracts

- Listener traversal follows connection order.
- Each callback starts independently through Roblox's task scheduler.
- Callback completion order is not guaranteed.
- A callback error occurs in its spawned task and does not propagate to `fire`.
- Dispatch saves the next list node before scheduling a callback, so a
  listener can disconnect itself safely.
- `once` removes its connection before user code, including during re-entry.
- `destroy` currently delegates to `disconnectAll`; treat it as terminal by
  convention rather than relying on future calls being rejected.

## Learn the behavior behind the signatures

- [Getting Started](./getting-started) for the smallest typed signal.
- [Signals and Connections](./signals) for scheduling and re-entry.
- [Lifecycle](./lifecycle) for ownership, waiting, reuse, and teardown.
- [Crystal Run](./project-crystal-run) for the complete game event layer.
- [Performance](./performance) for storage and listener churn tradeoffs.
