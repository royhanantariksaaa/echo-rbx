---
title: API Map
description: Choose the Echo root, Signal, or Connection reference and review the exact scheduling, mutation, typing, and lifecycle contracts shared by every method.
---

# Echo API Map

<div className="lesson-header">
  <p className="lesson-kicker"><span className="streamline-icon streamline-icon--code" aria-hidden="true"></span> Reference / Complete surface</p>
  <p className="lesson-summary">Move from a gameplay event to its exact constructor, callback type, scheduling boundary, connection state, and teardown rule. Echo is small enough to map completely on one page, but its asynchronous behavior still deserves an explicit contract.</p>
</div>

## Choose a surface

<div className="reference-switchboard">
  <a href="/echo-rbx/api/Echo/"><span className="streamline-icon streamline-icon--identity" aria-hidden="true"></span><span><strong>Echo</strong><br/><small>Create a typed signal from the root module.</small></span><span>1 factory</span></a>
  <a href="/echo-rbx/api/Signal/"><span className="streamline-icon streamline-icon--code" aria-hidden="true"></span><span><strong>Signal</strong><br/><small>Subscribe, fire, wait, clear, and communicate final ownership.</small></span><span>6 methods</span></a>
  <a href="/echo-rbx/api/Connection/"><span className="streamline-icon streamline-icon--check" aria-hidden="true"></span><span><strong>Connection</strong><br/><small>Inspect and end one stable subscription.</small></span><span>1 method + state</span></a>
</div>

The generated pages are the signature index. This page adds the behavior that
cannot be inferred from a method name alone.

## Root factory and exported types

Echo exports one runtime function and two Luau types:

```lua
type Signal<T...> = Echo.Signal<T...>
type Connection<T...> = Echo.Connection<T...>

function Echo.new<T...>(): Signal<T...>
```

The shared type pack checks every subscription and dispatch against the same
payload contract:

```lua
type Rewarded = Echo.Signal<Player, string, number>

local rewarded: Rewarded = Echo.new()

rewarded:connect(function(player, rewardId, amount)
    print(player.Name, rewardId, amount)
end)

rewarded:fire(player, "daily-login", 250)
```

`Echo.new()` has no configuration object, event name, buffer, priority, or
runtime schema. Put those policies in the game-owned module that contains the
signal.

## Signal surface

| Primary | Alias | Returns | Yields caller | Exact role |
|---|---|---|---|---|
| `connect(callback)` | `Connect` | `Connection<T...>` | No | Append a persistent listener. |
| `once(callback)` | `Once` | `Connection<T...>` | No | Append a listener that disconnects before its first callback. |
| `wait()` | `Wait` | `T...` | Yes | Suspend this coroutine until one future fire. |
| `fire(...)` | `Fire` | nothing | No explicit yield | Resume connected callbacks through `task.spawn`. |
| `disconnectAll()` | `DisconnectAll` | nothing | No | Disconnect every current handle and leave the signal reusable. |
| `destroy()` | `Destroy` | nothing | No | Perform the same clearing operation while expressing terminal owner intent. |

Lowercase methods are primary. PascalCase aliases point to the same
implementations; they do not add Roblox `RBXScriptSignal` semantics or change
scheduling.

### `connect` and `once`

Both methods append a linked connection node and return its public handle.
`once` is implemented as a normal connection whose wrapper disconnects before
calling user code. That order makes nested fires safe:

```lua
local opened: Echo.Signal<string> = Echo.new()

opened:once(function(source)
    print("first", source)
    opened:fire("nested") -- the once-listener is already disconnected
end)

opened:fire("initial")
```

### `wait`

`wait()` creates an internal one-shot connection, yields the calling
coroutine, and returns every argument from the fire that resumes it. It has no
built-in timeout or cancellation result. Clearing the signal removes that
hidden subscription and leaves the waiting coroutine suspended, so use the
[cancellable wait pattern](/echo-rbx/docs/lifecycle/#build-a-cancellable-wait)
when teardown can win the race.

### `fire`

`fire(...)` walks the linked list from head to tail and resumes each connected
callback with `task.spawn`. The method itself does not yield or collect
callback results. A callback can begin before `fire` returns because
`task.spawn` resumes work immediately through Roblox's scheduler, but the
publisher does not await all callback completion.

The useful guarantees are:

- traversal reaches existing nodes in connection order;
- each callback has an independent scheduled execution;
- a yielding callback keeps its runner busy without blocking later callbacks;
- completion order is not a contract once callbacks yield or re-enter;
- callback return values are ignored;
- an error belongs to the spawned callback task and is not returned by `fire`.

Use a direct function, Promise, or request-response abstraction when the
publisher needs a value or failure before it can continue.

### `disconnectAll` and `destroy`

Both methods walk every current connection, set `connected` to `false`, clear
the node payloads, and reset the signal's head and tail. New connections can be
added after either call at runtime.

The names communicate different ownership:

| Call | Intended meaning | Runtime enforcement |
|---|---|---|
| `disconnectAll()` | End the current listener generation; the signal may serve another round or screen. | Reuse is allowed. |
| `destroy()` | The owner is ending and should publish no more events. | Terminal use is conventional, not enforced. |

Do not write code that depends on post-`destroy` reuse even though the current
implementation permits it. A game-owned wrapper can add a destroyed guard when
that invariant must be enforced.

## Connection surface

| Member | Type | Contract |
|---|---|---|
| `connected` | `boolean` | Starts `true`; becomes `false` after individual, one-shot, bulk, or owner teardown. |
| `disconnect()` | method | Removes this known node in O(1) and clears references held by the node. |
| `Disconnect()` | alias | Calls the same lowercase implementation. |

Disconnection is idempotent. Echo never recycles a public connection object,
so a stale handle cannot disconnect a listener created later:

```lua
local first = changed:connect(onFirst)
first:disconnect()

local second = changed:connect(onSecond)
first:disconnect() -- harmless; second remains connected
```

## Dispatch mutation contract

Echo saves a node's next pointer before scheduling that node. This makes
self-disconnection safe, but it is not a frozen listener snapshot.

| Mutation inside a callback | What you may rely on |
|---|---|
| Disconnect the current handle | The current callback finishes; later fires skip it. |
| Run a `once` callback that fires recursively | The one-shot callback does not run again. |
| Disconnect a later handle | If it becomes disconnected before traversal schedules it, it is skipped. |
| Connect a new listener | It receives later fires; same-fire delivery is not a supported assumption. |
| Call `disconnectAll()` | Already scheduled work is not cancelled; unscheduled disconnected nodes are skipped. |
| Mutate a table passed to `fire` | Echo does not clone it; callbacks observe the same table reference. |

If every subscriber must observe an immutable event snapshot, construct a new
payload table per fire and do not mutate it after publishing.

## Runtime validation and omissions

Echo relies on strict Luau types for most misuse detection. It does not perform
an explicit runtime callback check, payload schema validation, duplicate
subscription detection, or destroyed-state guard. It also does not provide:

- replay or retained values;
- synchronous return aggregation;
- listener priorities;
- cancellation tokens for `wait`;
- network transport or server authority;
- automatic ownership of game features.

Those omissions keep the primitive small. Compose the missing policy in a
domain event hub instead of subclassing Signal.

## Choose the right operation

| Need | Use | Avoid |
|---|---|---|
| Repeated notification | `connect` and retain the handle | Reconnecting on every fire |
| First future occurrence | `once` | A persistent callback with a forgotten boolean guard |
| Suspend one coroutine | `wait` | `wait` when teardown or timeout must be observable |
| Notify independent consumers | `fire` | `fire` as a query that expects a result |
| End one consumer | `connection:disconnect()` | Clearing subscribers owned by other features |
| Reset a reusable phase bus | `disconnectAll()` | Reallocating a signal only to clear listeners |
| End the signal owner | `destroy()` and release references | Assuming Echo rejects later calls |

## Complete ownership example

```lua title="RewardEvents.luau"
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Echo = require(ReplicatedStorage.Libraries.Echo)

export type Reward = {
    id: string,
    amount: number,
}

export type RewardEvents = {
    granted: Echo.Signal<Player, Reward>,
    destroy: (self: RewardEvents) -> (),
}

local RewardEvents = {}

function RewardEvents.new(): RewardEvents
    local granted: Echo.Signal<Player, Reward> = Echo.new()

    return {
        granted = granted,
        destroy = function(self)
            self.granted:destroy()
        end,
    }
end

return RewardEvents
```

The wrapper owns vocabulary and teardown; subscribers still own their returned
connections. Continue with [Signals and Connections](/echo-rbx/docs/signals/)
for scheduling and mutation traces, [Lifecycle](/echo-rbx/docs/lifecycle/)
for cancellation and teardown order, and the
[Crystal Run event layer](/echo-rbx/docs/project-crystal-run/) for the complete
game composition.
