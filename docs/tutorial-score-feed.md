---
sidebar_position: 2.5
title: Build a Score Feed
description: Create, fire, disconnect, and clean up a typed Echo signal in Roblox Studio.
---

# Tutorial: Build a Score Feed

This tutorial builds one typed score signal with three independent subscribers:
a HUD total, an analytics listener, and a one-time milestone. The analytics
listener disconnects while the signal remains live.

<figure className="tutorial-demo">
  <img className="tutorial-demo__motion" src="/echo-rbx/tutorials/echo-signal-flow.gif" alt="Echo score signal firing in Roblox Studio" />
  <img className="tutorial-demo__still" src="/echo-rbx/tutorials/echo-signal-flow.png" alt="Final Echo score signal result in Roblox Studio" />
  <figcaption>Real Echo listeners receiving six score events in Roblox Studio.</figcaption>
</figure>

## Before you start

Echo has no runtime dependencies. Map the repository to
`ReplicatedStorage.Libraries.Echo`, then add this client script:

```text
ReplicatedStorage
`- Libraries
   `- Echo
StarterPlayer
`- StarterPlayerScripts
   `- ScoreFeed.client.luau
```

## Write the signal flow

```lua title="StarterPlayerScripts/ScoreFeed.client.luau"
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Echo = require(ReplicatedStorage.Libraries.Echo)

type ScoreSignal = Echo.Signal<number>

local scored: ScoreSignal = Echo.new()
local total = 0

local hudConnection = scored:Connect(function(points)
    total += points
    print(`HUD total: {total}`)
end)

local analyticsConnection = scored:Connect(function(points)
    print(`Analytics tracked +{points}`)
end)

scored:Once(function(points)
    print(`First score milestone: {points}`)
end)

local amounts = { 5, 10, 5, 15, 10, 20 }

for index, points in amounts do
    scored:Fire(points)

    if index == 4 then
        analyticsConnection:Disconnect()
        print("Analytics disconnected")
    end

    task.wait(0.75)
end

hudConnection:Disconnect()
scored:Destroy()
```

Press **Play**. The output ends with a HUD total of `65`. The milestone runs
only for the first value, and analytics receives only the first four values.

## How it works

1. `Echo.new()` allocates an empty signal. The `ScoreSignal` annotation makes
   every callback and `Fire` call use the same `number` argument pack.
2. `Connect` returns a stable connection handle. Each callback runs
   independently, so a yielding subscriber does not hold up the others.
3. `Once` disconnects itself before it invokes the callback. A reentrant
   `Fire` cannot invoke the one-time listener twice.
4. `Disconnect` removes only that connection. Other listeners and the signal
   remain valid.
5. `Destroy` disconnects the remaining listeners and releases the signal.

## API checkpoints

| API | Use it for |
|---|---|
| `Echo.new()` | Create a signal with an optional typed argument pack. |
| `signal:Connect(callback)` | Subscribe until the returned connection is disconnected. |
| `signal:Once(callback)` | Subscribe to the next fire only. |
| `signal:Fire(...)` | Dispatch arguments asynchronously to current listeners. |
| `signal:Wait()` | Yield the current thread until the next fire. |
| `signal:DisconnectAll()` | Remove every listener without destroying the signal. |
| `signal:Destroy()` | Permanently release the signal and its listeners. |

Lowercase methods such as `connect`, `fire`, and `destroy` are equivalent to
their Roblox-style PascalCase aliases.

## Common mistakes

### Recreating the signal for every event

Create the signal once, then call `Fire` many times. A new signal has no
knowledge of listeners attached to the old one.

### Losing the connection handle

Keep the object returned by `Connect` when the subscriber has a shorter
lifetime than the signal. Disconnecting is constant-time.

### Firing with the wrong arguments

Annotate shared signals with `Echo.Signal<T...>`. Luau then catches mismatched
callback parameters and `Fire` calls before playtesting.

## Next steps

Read [Signals and Connections](./signals) for dispatch semantics, then use
[Lifecycle](./lifecycle) to choose between `DisconnectAll` and `Destroy`.
