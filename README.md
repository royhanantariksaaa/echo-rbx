# Echo

[![Documentation](https://github.com/royhanantariksaaa/echo-rbx/actions/workflows/docs.yml/badge.svg)](https://royhanantariksaaa.github.io/echo-rbx/)

**Documentation:** [royhanantariksaaa.github.io/echo-rbx](https://royhanantariksaaa.github.io/echo-rbx/)

Echo is a small, dependency-free Luau signal implementation for Roblox. It
uses stable connection handles, O(1) linked-list insertion and removal, and a
reusable runner coroutine for asynchronous handler dispatch.

Echo is the event primitive used by
[Weave](https://github.com/royhanantariksaaa/weave-rbx) and
[Flite](https://github.com/royhanantariksaaa/flite-rbx).

## Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API](#api)
- [Dispatch Semantics](#dispatch-semantics)
- [Performance](#performance)
- [Benchmarks](#benchmarks)
- [Integration](#integration)
- [Tests](#tests)

## Installation

Add the repository at `ReplicatedStorage.Libraries.Echo`:

```sh
git submodule add https://github.com/royhanantariksaaa/echo-rbx.git src/Shared/Libraries/Echo
```

For standalone Rojo development:

```sh
rojo serve default.project.json
```

Echo has no runtime dependencies.

## Quick Start

```lua
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Echo = require(ReplicatedStorage.Libraries.Echo)

local scored = Echo.new()

local connection = scored:connect(function(playerName, points)
    print(playerName, points)
end)

scored:fire("Alice", 42)
connection:disconnect()

scored:once(function(message)
    print(message)
end)
scored:fire("called once")
```

PascalCase aliases are available when a codebase prefers Roblox-style naming:

```lua
local connection = scored:Connect(function(value)
    print(value)
end)

scored:Fire("hello")
connection:Disconnect()
```

## API

### `Echo.new()`

```lua
local signal = Echo.new()
```

Creates an empty signal. The module exports generic `Signal<T...>` and
`Connection<T...>` types for typed consumers.

### Signal

| Primary method | Compatibility alias | Signature | Behavior |
|---|---|---|---|
| `:connect(fn)` | `:Connect(fn)` | `((...T) -> ()) -> Connection<T...>` | Adds a persistent handler. |
| `:once(fn)` | `:Once(fn)` | `((...T) -> ()) -> Connection<T...>` | Adds a handler that disconnects before its first invocation. |
| `:wait()` | `:Wait()` | `() -> ...T` | Yields the current thread until the next fire and returns all arguments. |
| `:fire(...)` | `:Fire(...)` | `(...T) -> ()` | Schedules every currently connected handler without yielding the caller. |
| `:disconnectAll()` | `:DisconnectAll()` | `() -> ()` | Disconnects all current handlers. The signal remains reusable. |
| `:destroy()` | `:Destroy()` | `() -> ()` | Exact lifecycle alias of `disconnectAll`; terminal use is conventional, not enforced. |

### Connection

| Field or method | Compatibility alias | Behavior |
|---|---|---|
| `.connected` | none | `true` while the subscription is active. |
| `:disconnect()` | `:Disconnect()` | Removes the subscription in O(1). Repeated calls are safe. |

Connection objects are stable public handles. Echo deliberately does not
recycle them, so an old disconnected handle can never refer to a later
subscription.

## Dispatch Semantics

- `fire` does not yield. Each handler runs through `task.spawn`.
- Handler errors stay in the spawned task and do not propagate through
  `fire` or prevent other handlers from being scheduled.
- Handlers are traversed in connection order, but asynchronous completion
  order is not guaranteed.
- A yielding handler does not block other handlers. Its runner remains busy,
  so re-entrant dispatch uses another runner.
- `once` disconnects before calling user code, including during re-entrant
  fires.
- `disconnectAll` updates every returned handle's `.connected` field.
- `wait` must be called from a yieldable thread.

## Performance

The source uses `--!native` and `--!optimize 2`. Its storage is intentionally
simple:

- A doubly linked list gives O(1) connect and disconnect with no compaction.
- Head and tail pointers make append O(1).
- Firing performs one forward traversal and saves the next node before
  scheduling user code.
- One completed, non-yielding handler runner can be reused by later dispatches.
- Connection pooling is avoided because recycling public handles can let stale
  references mutate unrelated subscriptions.

There is no explicit SIMD implementation. Signal dispatch is pointer traversal
plus dynamic callback invocation, not homogeneous numeric work that maps well
to SIMD lanes. Roblox Luau also provides no portable API for controlling CPU
L1, L2, L3, or platform-specific additional caches. Echo improves locality
indirectly by keeping nodes small and traversing once, but linked lists still
trade spatial locality for constant-time churn. That tradeoff is measured
rather than assumed.

In real games, callback work and scheduler overhead commonly dominate the few
table accesses inside Echo. Profile the complete workload before adding more
storage complexity.

## Benchmarks

`benchmarks/SignalStorage.bench.luau` compares the linked-list strategy with a
dense array that compacts removed entries. It includes steady dispatch and a
disconnect/reconnect churn case at 8, 64, and 512 listeners.

With the Luau CLI installed:

```sh
luau benchmarks/SignalStorage.bench.luau
```

Results vary by Luau version and hardware. The benchmark exists to guard the
storage decision, not to promise a universal timing number. Dense arrays can
win on pure sequential reads; the linked list avoids their compaction cost and
preserves stable O(1) removals.

## Integration

### Weave cleanup

```lua
local bus = Echo.new()

Weave.mount(PlayerGui, function(scope)
    scope:onCleanup(function()
        bus:disconnectAll()
    end)

    return scope:TextButton {
        Text = "Emit",
        [Weave.OnEvent("Activated")] = function()
            bus:fire("button-pressed", os.clock())
        end,
    }
end)
```

### Flite signals

Flite uses Echo behind local framework signals and state subscriptions. Its
network signal facade adds methods such as `fireClient` and `fireAllClients`;
those methods belong to Flite, not to a standalone Echo signal.

```text
Echo       signal dispatch
  -> Weave reactive subscriptions
  -> Flite local framework events and state observers
```

## Tests

`tests/RuntimeSmoke.luau` is a Studio smoke suite covering dispatch,
idempotent disconnection, stable stale handles, `once`, complete PascalCase
compatibility aliases, `disconnectAll`, and reuse after clearing.

The storage comparison lives separately in
`benchmarks/SignalStorage.bench.luau` so correctness tests do not depend on
machine-specific timing thresholds.

## License

[MIT](./LICENSE)
