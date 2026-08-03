---
sidebar_position: 2.5
title: Build a Score Feed
description: Create, fire, disconnect, and clean up a typed Echo signal in Roblox Studio.
---

# Tutorial: Build a Score Feed

<div className="lesson-header">
  <p className="lesson-kicker"><span className="streamline-icon streamline-icon--code" aria-hidden="true"></span> Focused tutorial / Chapter 3</p>
  <p className="lesson-summary">Build one typed score signal with independent HUD, analytics, and one-time milestone subscribers, then shorten one listener's lifetime without stopping the signal.</p>
  <div className="lesson-progress" aria-label="Learn Echo progress: 60 percent"><span className="lesson-progress__fill lesson-progress__fill--60"></span></div>
</div>

<div className="lesson-goals">
  <strong>What this feature proves</strong>
  <ul>
    <li>One typed event can support subscribers with different responsibilities.</li>
    <li>Connection lifetime and signal lifetime can be managed independently.</li>
    <li>The same pattern scales into Crystal Run's shared client event hub.</li>
  </ul>
</div>

<figure className="tutorial-demo">
  <img className="tutorial-demo__motion" src="/echo-rbx/tutorials/echo-signal-flow.gif" alt="Echo score signal firing in Roblox Studio" />
  <img className="tutorial-demo__still" src="/echo-rbx/tutorials/echo-signal-flow.png" alt="Final Echo score signal result in Roblox Studio" />
  <figcaption>Real Echo listeners receiving six score events in Roblox Studio.</figcaption>
</figure>

:::tip Experiment alongside the tutorial
Open the [Echo Playground](./playground) to rearrange Fire, Disconnect, Once,
and Destroy calls while the connection table and dispatch trace update.
:::

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

Read [Signals and Connections](./signals) for dispatch semantics and
[Lifecycle](./lifecycle) for teardown choices. Then apply both ideas in a
multi-system client event layer.

<div className="chapter-next">
  <p><strong>Continue into the complete game.</strong><br />Bridge Flite round facts into typed HUD, feedback, analytics, and milestone subscribers.</p>
  <a href="/echo-rbx/docs/project-crystal-run/">Build Crystal Run's events</a>
</div>
