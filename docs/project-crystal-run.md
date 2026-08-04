---
title: "Crystal Run: Local Event Layer"
description: Build Crystal Run's typed client event bridge with independent feedback subscribers, one-shot milestones, and deterministic cleanup.
---

# Crystal Run: Local Event Layer

<div className="project-header">
  <p className="project-kicker"><span className="streamline-icon streamline-icon--identity" aria-hidden="true"></span> Complete game / Layer 2 of 4</p>
  <p className="project-summary">Turn Flite's replicated round state and network signals into a small typed event vocabulary that audio, HUD, analytics, and milestone features can consume independently.</p>
  <div className="lesson-progress" aria-label="Complete game progress: layer 2 of 4"><span className="lesson-progress__fill lesson-progress__fill--50"></span></div>
</div>

<div className="project-outcome">
  <strong>What you will finish</strong>
  <ul>
    <li>A typed event hub for phase, pickup, and round-result events.</li>
    <li>A Flite-to-Echo bridge with one owner and one teardown path.</li>
    <li>Independent persistent and one-shot gameplay subscribers.</li>
    <li>A repeatable lifecycle test that catches duplicate listeners.</li>
  </ul>
</div>

## The complete project route

This chapter consumes the public model from the Flite layer. It does not move
authority to the client. Echo only distributes facts the server has already
replicated or confirmed.

<div className="project-map">
  <a href="https://royhanantariksaaa.github.io/flite-rbx/docs/project-crystal-run/"><span>01 / Flite</span><strong>Authoritative loop</strong><small>Rounds, networking, state, persistence.</small></a>
  <div className="project-map__current"><span>02 / Echo</span><strong>Local event bridge</strong><small>Typed fan-out and teardown.</small></div>
  <a href="https://royhanantariksaaa.github.io/weave-rbx/docs/project-crystal-run/"><span>03 / Weave</span><strong>Reactive HUD</strong><small>Live timer, score, and feedback.</small></a>
  <a href="https://royhanantariksaaa.github.io/weavekit-rbx/docs/project-crystal-run/"><span>04 / WeaveKit</span><strong>Game surfaces</strong><small>Lobby, settings, and results.</small></a>
</div>

<div className="project-contract">
  <div><span>Inputs</span><strong>Flite state and network signals</strong></div>
  <div><span>Local vocabulary</span><strong>phase, pickup, result</strong></div>
  <div><span>Subscribers</span><strong>HUD, sound, telemetry, milestone</strong></div>
</div>

## 1. Add the client feature tree

Continue from the Flite chapter and add two controllers plus one shared client
module:

```text
StarterPlayer
`- StarterPlayerScripts
   |- Controllers
   |  |- RoundController.luau
   |  |- EventBridgeController.luau
   |  `- FeedbackController.luau
   |- Features
   |  `- CrystalRunEvents.luau
   `- ClientBootstrap.client.luau
```

`RoundController` comes from the Flite layer. `EventBridgeController` is the
only module allowed to translate its model into local Echo events.

## 2. Define the typed event vocabulary

Keep event names about completed gameplay facts. A signal named
`crystalCollected` is safer than a command-like `collectCrystal`, because no
subscriber should be able to award currency by firing a local notification.

<p className="project-file">StarterPlayerScripts/Features/CrystalRunEvents.luau</p>

```lua title="StarterPlayerScripts/Features/CrystalRunEvents.luau"
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Echo = require(ReplicatedStorage.Libraries.Echo)

export type Phase = "Lobby" | "Playing" | "Results"

export type Events = {
    phaseChanged: Echo.Signal<Phase, number>,
    crystalCollected: Echo.Signal<number, number>,
    roundEnded: Echo.Signal<number, number>,
    destroy: (self: Events) -> (),
}

local CrystalRunEvents = {}

function CrystalRunEvents.new(): Events
    local self = {
        phaseChanged = Echo.new() :: Echo.Signal<Phase, number>,
        crystalCollected = Echo.new() :: Echo.Signal<number, number>,
        roundEnded = Echo.new() :: Echo.Signal<number, number>,
    } :: any

    function self:destroy()
        self.phaseChanged:destroy()
        self.crystalCollected:destroy()
        self.roundEnded:destroy()
    end

    return self
end

return CrystalRunEvents
```

The argument packs are part of the game contract:

| Event | Arguments | Meaning |
|---|---|---|
| `phaseChanged` | phase, seconds | The replicated round phase changed. |
| `crystalCollected` | score, crystalId | This client received a confirmed pickup. |
| `roundEnded` | roundScore, lifetimeTotal | The server finalized this player's result. |

## 3. Bridge the network model once

The bridge owns one event hub for the complete client session. Other
controllers declare a dependency on this controller instead of connecting to
Flite repeatedly.

<p className="project-file">StarterPlayerScripts/Controllers/EventBridgeController.luau</p>

```lua title="StarterPlayerScripts/Controllers/EventBridgeController.luau"
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Flite = require(ReplicatedStorage.Libraries.Flite)
local CrystalRunEvents = require(script.Parent.Parent.Features.CrystalRunEvents)

return Flite.createController("EventBridgeController", function(self)
    local roundService = self:useService("RoundService")
    local events = CrystalRunEvents.new()

    self.events = events

    self:Observe(roundService.phase, function(nextPhase)
        events.phaseChanged:fire(
            nextPhase,
            roundService.timeRemaining:Get()
        )
    end)

    self:onStart(function()
        local collectedConnection = roundService.crystalCollected:connect(
            function(score, crystalId)
                events.crystalCollected:fire(score, crystalId)
            end
        )

        local endedConnection = roundService.roundEnded:connect(
            function(score, lifetime)
                events.roundEnded:fire(score, lifetime)
            end
        )

        self:AddCleanup(function()
            collectedConnection:disconnect()
            endedConnection:disconnect()
        end)
    end)

    self:onStop(function()
        events:destroy()
    end)
end)
```

The phase observer is owned by the Flite controller's Weave scope. The two
network connections are not Weave states, so the bridge registers explicit
disconnect callbacks. `events:destroy()` clears every remaining local
subscriber when the controller stops.

## 4. Add independent feedback features

This controller demonstrates the reason for the bridge. Analytics, output,
milestones, and later UI can subscribe without knowing anything about Flite's
service proxy.

<p className="project-file">StarterPlayerScripts/Controllers/FeedbackController.luau</p>

```lua title="StarterPlayerScripts/Controllers/FeedbackController.luau"
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Flite = require(ReplicatedStorage.Libraries.Flite)

return Flite.createController("FeedbackController", function(self)
    local eventBridge = self:useController("EventBridgeController")

    self:onStart(function()
        local events = eventBridge.events
        local connections = {}

        table.insert(connections, events.phaseChanged:connect(
            function(phase, seconds)
                print(`Phase changed to {phase} with {seconds}s remaining`)
            end
        ))

        table.insert(connections, events.crystalCollected:connect(
            function(score, crystalId)
                print(`Telemetry: crystal {crystalId}, score {score}`)
            end
        ))

        table.insert(connections, events.crystalCollected:once(
            function()
                print("Milestone: first crystal of this client session")
            end
        ))

        table.insert(connections, events.roundEnded:connect(
            function(roundScore, lifetime)
                print(`Result: {roundScore} round / {lifetime} lifetime`)
            end
        ))

        self:AddCleanup(function()
            for _, connection in connections do
                connection:disconnect()
            end
            table.clear(connections)
        end)
    end)
end)
```

`once` disconnects before user code runs. If its callback causes another local
pickup event, the milestone still cannot run twice.

## 5. Understand the dispatch boundary

```text
RoundService (server)
  -> Flite transport and replicated state
  -> EventBridgeController (one translation point)
  -> Echo event hub
       -> FeedbackController
       -> Weave HUD
       -> audio feature
       -> analytics feature
```

- Flite decides whether an event is valid and which player receives it.
- Echo schedules local subscribers independently with `task.spawn`.
- A yielding audio or analytics subscriber cannot delay the HUD subscriber.
- Disconnecting one feature never tears down the source or another feature.

## 6. Add a lifecycle regression test

This small client-only harness tests the event hub without starting Flite. Run
it from a LocalScript in a test place or adapt it to your test framework.

```lua title="CrystalRunEvents.spec.luau"
local CrystalRunEvents = require(path.to.CrystalRunEvents)

local events = CrystalRunEvents.new()
local persistentDeliveries = {}
local onceDeliveries = {}

local persistent = events.crystalCollected:connect(function(score)
    table.insert(persistentDeliveries, score)
end)

events.crystalCollected:once(function(score)
    table.insert(onceDeliveries, score)
end)

events.crystalCollected:fire(1, 4)
task.wait()
events.crystalCollected:fire(2, 8)
task.wait()

persistent:disconnect()
events.crystalCollected:fire(3, 9)
task.wait()

assert(#persistentDeliveries == 2)
assert(persistentDeliveries[1] == 1)
assert(persistentDeliveries[2] == 2)
assert(#onceDeliveries == 1)
assert(onceDeliveries[1] == 1)

local lingering = events.roundEnded:connect(function()
    error("destroyed event hub delivered to a lingering subscriber")
end)

events:destroy()
assert(not lingering.connected)
```

The test catches three common regressions: a one-shot listener firing twice, a
disconnected handle still receiving events, and final teardown leaving a
connection active.
It intentionally does not assert ordering between different subscribers,
because asynchronous callback completion order is not part of Echo's contract.

## 7. Verify the layer in a multiplayer run

<ul className="project-checklist">
  <li>Each client logs only its own confirmed crystal pickups.</li>
  <li>The first-pickup milestone runs once per client session.</li>
  <li>Both clients receive the shared phase transition.</li>
  <li>A slow subscriber does not delay another subscriber's start.</li>
  <li>Stopping Flite disconnects network bridges before destroying local events.</li>
  <li>Starting the client once produces one delivery, never duplicate output.</li>
</ul>

## Failure paths you should test

| Failure | Expected behavior |
|---|---|
| Analytics callback errors | Its spawned task errors; other subscribers still run. |
| Feedback controller stops | Its handles disconnect; the shared hub remains valid. |
| Event bridge stops | Network handles disconnect, then all local signals are cleared. |
| Reentrant fire inside `once` | The one-shot subscriber does not run again. |
| A stale handle disconnects twice | Both calls are harmless and cannot affect a newer listener. |

<div className="quick-challenge">
  <span className="quick-challenge__label">Production extension</span>
  <p>Add a typed `streakChanged` signal carrying the current streak and multiplier. Derive it from confirmed pickup events inside one owner, then reset it when `phaseChanged` enters Results.</p>
</div>

## API trail

- [Signals and Connections](./signals) for dispatch and re-entry semantics.
- [Lifecycle](./lifecycle) for stable handles and teardown choices.
- [Performance](./performance) for listener churn and scheduling costs.
- [Echo API map](./api-overview) for root, signal, and connection reference.

<div className="chapter-next">
  <p><strong>Next layer:</strong> turn the replicated model and local pickup events into a responsive HUD with no manual redraw calls.</p>
  <a href="https://royhanantariksaaa.github.io/weave-rbx/docs/project-crystal-run/">Continue in Weave</a>
</div>
