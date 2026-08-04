---
sidebar_position: 3
---

# Signals and Connections

<div className="lesson-header">
  <p className="lesson-kicker"><span className="streamline-icon streamline-icon--identity" aria-hidden="true"></span> Signal semantics / Delivery</p>
  <p className="lesson-summary">Follow one dispatch from typed publisher to independent subscribers, then reason about scheduling, payload snapshots, listener mutation, re-entry, and errors without treating an event as a synchronous function call.</p>
</div>

## Start with the right abstraction

An Echo signal is a **notification boundary**. One publisher announces a fact;
zero or more subscribers react without the publisher knowing who they are.

| Requirement | Echo signal? | Better fit when it is not |
|---|---|---|
| Tell HUD, audio, and analytics that a pickup was confirmed | Yes | - |
| Ask inventory code whether a purchase is valid | No | Direct typed function |
| Return one result or error to the caller | No | Function or Promise |
| Store the latest round phase for late readers | Not by itself | Weave state or another state container |
| Send a client request to the server | No | Flite or Roblox networking |

Name signals as facts in past tense or state transitions: `crystalCollected`,
`roundEnded`, and `phaseChanged`. A command-like signal such as
`awardCurrency` hides authority and makes it too easy for a local subscriber to
look like a trusted producer.

## Define one payload contract

The type pack on `Echo.Signal<T...>` is shared by `connect`, `once`, `wait`,
and `fire`:

```lua
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Echo = require(ReplicatedStorage.Libraries.Echo)

type Pickup = {
    crystalId: number,
    score: number,
    worldPosition: Vector3,
}

local crystalCollected: Echo.Signal<Player, Pickup> = Echo.new()

crystalCollected:connect(function(player, pickup)
    print(player.Name, pickup.crystalId, pickup.score)
end)

crystalCollected:fire(player, {
    crystalId = 41,
    score = 120,
    worldPosition = Vector3.new(8, 3, -12),
})
```

Prefer one small record when arguments describe one event. It is easier to add
an optional field to a named record than to remember what the fourth positional
number means across many subscribers.

Echo forwards values exactly as supplied. Tables and Instances are references,
not copies. Because callbacks run through the task scheduler, mutating a
payload immediately after `fire` can change what a subscriber observes:

```lua
local event = { score = 10 }
scoreChanged:fire(event)

event.score = 999 -- unsafe: subscribers share this table reference
```

Create a fresh event record and treat it as immutable after publishing when
all subscribers need the same snapshot.

## Know the complete surface

| Primary method | Alias | Behavior |
|---|---|---|
| `connect(callback)` | `Connect` | Adds a persistent listener and returns a stable connection. |
| `once(callback)` | `Once` | Disconnects before invoking the listener once. |
| `wait()` | `Wait` | Yields until the next fire and returns its arguments. |
| `fire(...)` | `Fire` | Resumes connected callbacks through `task.spawn`. |
| `disconnectAll()` | `DisconnectAll` | Clears active listeners while keeping the signal reusable. |
| `destroy()` | `Destroy` | Performs the same clear while communicating terminal owner intent. |

See the generated [`Signal` API](/echo-rbx/api/Signal/) for exact signatures
and the [`Connection` API](/echo-rbx/api/Connection/) for handle state.

## Trace one dispatch

Echo stores connections in a doubly linked list. A fire follows this sequence:

1. Read the current head connection.
2. Save that node's next pointer before any callback can mutate the list.
3. If the node is still connected, acquire a runner coroutine and pass it to
   `task.spawn` with the callback and payload.
4. Continue from the saved next pointer until traversal reaches the end.

Roblox documents `task.spawn` as resuming a function or coroutine immediately
through the engine scheduler. A handler can therefore start before `fire`
returns. Echo does not explicitly yield the publisher, wait for all handlers,
or aggregate their return values.

```lua
local changed: Echo.Signal<number> = Echo.new()

changed:connect(function(value)
    print("A start", value)
    task.wait(0.2)
    print("A finish", value)
end)

changed:connect(function(value)
    print("B", value)
end)

changed:fire(5)
print("publisher continued")
```

Do not make correctness depend on the relative order of `A finish`, `B`, and
`publisher continued`. The stable contract is independent scheduled delivery,
not synchronous completion ordering. Read Roblox's
[scheduler guide](https://create.roblox.com/docs/scripting/scheduler) when the
difference between `task.spawn`, `task.defer`, and frame boundaries matters.

## Separate traversal order from completion order

Echo visits connection nodes from oldest to newest. That is useful for a
repeatable dispatch trace, but it is not a priority system.

| Ordering question | Contract |
|---|---|
| Which node is considered first? | Earlier connection first. |
| Can a callback begin before `fire` returns? | Yes. |
| Does a yielding callback delay later callback scheduling? | No. |
| Which yielding callback finishes first? | Unspecified. |
| Are callback return values available to the publisher? | No; they are ignored. |

When feature B must run after feature A succeeds, compose that sequence inside
one owner with direct calls or a Promise. Do not encode dependency order by
connecting callbacks in a particular order.

## Understand connection identity

Every subscription returns its own public object:

```lua
local connection = changed:connect(onChanged)

print(connection.connected) -- true
connection:disconnect()
print(connection.connected) -- false
connection:disconnect()      -- safe again
```

Echo does not recycle public handles. Disconnection clears the node's signal,
callback, and neighbor references. A stale handle stays disconnected and can
never point at a replacement listener.

Keep the handle whenever that subscriber has an owner shorter than the signal:

```lua
local hudConnection = scoreChanged:connect(renderScore)

local function closeHud()
    hudConnection:disconnect()
end
```

Losing the handle does not disconnect the callback; it only removes your
ability to end that one subscription directly.

## Mutate listeners deliberately

The list is safe to modify during delivery, but a fire is not a frozen copy of
all listeners.

| Callback action | Current dispatch | Later dispatches |
|---|---|---|
| Disconnect itself | Current callback continues. | It is absent. |
| Disconnect a later listener before traversal reaches it | The later listener is skipped. | It is absent. |
| Connect a new listener | Same-fire delivery is not a supported assumption. | It is present. |
| Call `disconnectAll()` | Already scheduled callbacks continue; disconnected nodes not yet scheduled are skipped. | No old listener remains. |
| Destroy the signal | Same runtime clearing behavior as `disconnectAll()`. | Reuse is technically possible but violates terminal intent. |

If subscriber mutation determines gameplay outcome, the event boundary is
carrying too much orchestration. Move the state transition into one owning
module and publish the completed result afterward.

## Prove one-shot re-entry

`once` disconnects its connection before user code. That remains true when the
callback fires the same signal recursively:

```lua
local ready: Echo.Signal<number> = Echo.new()
local deliveries = 0

ready:once(function(value)
    deliveries += 1
    if value == 1 then
        ready:fire(2)
    end
end)

ready:fire(1)
task.wait()

assert(deliveries == 1)
```

The runner slot is unavailable while user code executes, so re-entrant work
uses another runner instead of resuming the currently running coroutine.

## Observe callback failures

A callback error occurs in its spawned task. It does not become a return value
from `fire`, and it does not intentionally stop unrelated subscribers. Studio
Output still reports the error.

Wrap the subscriber at the boundary where recovery or telemetry belongs:

```lua
roundEnded:connect(function(result)
    local ok, problem = xpcall(function()
        uploadRoundAnalytics(result)
    end, debug.traceback)

    if not ok then
        warn("Round analytics failed:\n" .. problem)
    end
end)
```

Do not wrap every fire in a publisher-level `pcall` and expect to catch
subscriber errors; the callbacks execute in their own scheduled tasks.

## Build a composed event hub

Prefer composition over an inherited "special signal". The hub gives signals
game-specific names and one owner while preserving Echo's small public surface:

```lua title="MatchEvents.luau"
local Echo = require(path.to.Echo)

export type Phase = "Lobby" | "Playing" | "Results"

export type MatchEvents = {
    phaseChanged: Echo.Signal<Phase, number>,
    scoreChanged: Echo.Signal<number>,
    roundEnded: Echo.Signal<number>,
    destroy: (self: MatchEvents) -> (),
}

local MatchEvents = {}

function MatchEvents.new(): MatchEvents
    local self = {
        phaseChanged = Echo.new(),
        scoreChanged = Echo.new(),
        roundEnded = Echo.new(),
    } :: any

    function self:destroy()
        self.phaseChanged:destroy()
        self.scoreChanged:destroy()
        self.roundEnded:destroy()
    end

    return self
end

return MatchEvents
```

This module owns vocabulary and final teardown. HUD, sound, analytics, and
achievements each own only the connections they create.

## Review the delivery checklist

- Is the signal announcing a completed fact rather than asking for a result?
- Does one type pack describe every producer and subscriber?
- Are table payloads treated as immutable after `fire`?
- Does each long-lived subscriber retain its connection?
- Is ordering handled by an owner instead of connection position?
- Are callback errors observed inside the callback boundary?
- Are network authority and retained state handled outside Echo?

The [Lifecycle chapter](/echo-rbx/docs/lifecycle/) continues from delivery to
owners, cancellation, waiting, teardown order, and repeated mount cycles. The
[Crystal Run event layer](/echo-rbx/docs/project-crystal-run/) applies the same
rules across HUD, audio, telemetry, and one-shot milestones.
