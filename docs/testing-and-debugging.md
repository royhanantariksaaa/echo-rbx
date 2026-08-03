---
sidebar_position: 6
title: Testing and Debugging
description: Verify Echo signal contracts in Studio, isolate lifecycle failures, trace real deliveries, and establish a repeatable release gate.
---

# Testing and Debugging

<div className="lesson-header">
  <p className="lesson-kicker"><span className="streamline-icon streamline-icon--check" aria-hidden="true"></span> Production / Verification</p>
  <p className="lesson-summary">Turn signal behavior into evidence: run the repository smoke suite, write a focused lifecycle regression, trace named subscribers, and test the ownership boundaries that fail in real games.</p>
</div>

<div className="lesson-goals">
  <strong>You will verify</strong>
  <ul>
    <li>Dispatch, one-shot delivery, disconnection, stale handles, clearing, and reuse.</li>
    <li>The exact signal lifetime owned by one feature in your game.</li>
    <li>Which publisher fired, which subscriber received, and which owner failed to clean up.</li>
  </ul>
</div>

## Use a verification ladder

One passing example does not prove a signal layer is production-ready. Test
from the smallest contract outward so a failure identifies one boundary:

| Layer | Run | Failure means |
|---|---|---|
| Package load | Require `ReplicatedStorage.Libraries.Echo`. | The package tree or sync is wrong. |
| Runtime smoke | Run `tests/RuntimeSmoke.luau`. | A core Echo contract regressed. |
| Feature regression | Exercise one game-owned signal and its cleanup. | Your ownership or payload contract is wrong. |
| Reopen cycle | Create and destroy the feature repeatedly. | A connection survives its intended owner. |
| Load profile | Measure realistic listener count and callback work. | The workload, not merely the signal primitive, needs attention. |

Keep these layers separate. A package smoke test should not need your HUD, and
a HUD regression should not duplicate every internal Echo invariant.

## Run the 13-check Studio smoke suite

The repository includes `tests/RuntimeSmoke.luau`. It is executable Script
source, not a ModuleScript that returns a value. Run it through Studio's
RunScript facility, or copy its contents into a temporary server Script in a
disposable test place:

```text
ReplicatedStorage
`- Libraries
   `- Echo              ModuleScript package
ServerScriptService
`- RuntimeSmoke         Script using tests/RuntimeSmoke.luau
```

Do not `require` the smoke file as a ModuleScript. A require would execute the
checks and then fail because the file intentionally has no return value.

Start a fresh server test and look for exactly:

```text
[Echo RuntimeSmoke] PASS (13 checks)
```

Remove or disable the temporary Script after it passes. An assertion before
the PASS line is the failure; the assertion message names the broken contract.

### What the suite proves

The 13 checks cover:

| Contract | Regression caught |
|---|---|
| Fired arguments reach handlers | Broken dispatch or payload forwarding. |
| `connected` begins true and becomes false | Public handle state drifting from listener state. |
| Disconnect is idempotent | Cleanup paths failing when called twice. |
| Public handles are never recycled | Stale code mutating a replacement listener. |
| `once` invokes exactly once | Re-entry or repeated milestone delivery. |
| PascalCase aliases work | Compatibility calls silently diverging from lowercase methods. |
| `disconnectAll` updates every handle | Bulk teardown leaving handles falsely active. |
| A cleared signal remains reusable | Clearing accidentally becoming permanent destruction. |

The smoke suite does not prove your game disconnects at the correct time, that
your payload has the right shape, or that a subscriber callback is cheap. Add
one feature-level regression for those decisions.

## Write a focused lifecycle regression

Use only public Echo APIs in game tests. The following harness verifies the
boundary most features need: persistent delivery, one-shot delivery, explicit
disconnect, and final teardown.

```lua title="ServerScriptService/ScoreSignal.spec.server.luau"
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Echo = require(ReplicatedStorage.Libraries.Echo)

local scored: Echo.Signal<number> = Echo.new()
local persistentTotal = 0
local onceCalls = 0

local persistent = scored:Connect(function(points)
    persistentTotal += points
end)

local milestone = scored:Once(function()
    onceCalls += 1
end)

scored:Fire(5)
task.wait()

assert(persistentTotal == 5, "persistent listener missed the first score")
assert(onceCalls == 1, "one-shot listener did not run exactly once")
assert(not milestone.connected, "one-shot handle should be disconnected")

persistent:Disconnect()
scored:Fire(10)
task.wait()

assert(persistentTotal == 5, "disconnected listener received another score")
assert(not persistent.connected, "persistent handle still reports connected")

scored:Destroy()
print("[ScoreSignal spec] PASS")
```

`Fire` schedules callbacks with `task.spawn`, so the harness yields before it
asserts callback effects. Keep the test about observable behavior. Do not read
Echo's linked-list fields or pooled runner thread.

## Trace a real signal without guessing

For intermittent failures, give every dispatch an ID and every subscriber a
stable name. Put the ID in the payload so asynchronous output remains
correlated:

```lua title="ReplicatedStorage/Shared/ScoreEvents.luau"
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Echo = require(ReplicatedStorage.Libraries.Echo)

export type ScoreEvent = {
    sequence: number,
    points: number,
    source: string,
}

local scored: Echo.Signal<ScoreEvent> = Echo.new()
local sequence = 0

local ScoreEvents = {}

function ScoreEvents.connect(name: string, callback: (ScoreEvent) -> ())
    return scored:Connect(function(event)
        print(`[Score #{event.sequence}] -> {name}`)
        callback(event)
    end)
end

function ScoreEvents.publish(points: number, source: string)
    sequence += 1
    local event = {
        sequence = sequence,
        points = points,
        source = source,
    }
    print(`[Score #{sequence}] fire {points} from {source}`)
    scored:Fire(event)
end

function ScoreEvents.destroy()
    scored:Destroy()
end

return ScoreEvents
```

A missing `fire` line points to the publisher. A `fire` line with no named
delivery points to connection lifetime. A named delivery with no visible
result points inside that subscriber. Remove verbose traces after the failure
is understood, or guard them behind your game's development flag.

## Diagnose by symptom

| Symptom | Inspect first | Likely correction |
|---|---|---|
| Nothing receives the event | Publisher path and signal identity. | Share one owned signal instead of constructing one per module. |
| One feature receives twice | Mount and reconnect paths. | Disconnect the previous handle before remounting. |
| A callback runs after a screen closes | The screen's cleanup owner. | Store the connection and disconnect when that owner closes. |
| A milestone fires repeatedly | Subscription constructor. | Use `Once`, or persist milestone state when it must survive sessions. |
| One callback fails while others continue | Studio Output for the spawned task error. | Handle the failing subscriber locally; Echo isolates callback errors from `Fire`. |
| `DisconnectAll` prevents later listeners | A later `Destroy` call or wrong signal reference. | Separate phase clearing from final owner destruction. |
| Test assertions race callback effects | The asynchronous dispatch boundary. | Wait for the expected callback or one scheduler turn before asserting. |

## Test ownership, not only delivery

Run the feature through this release matrix:

| Scenario | Expected invariant |
|---|---|
| Open once | Every intended subscriber connects once. |
| Close once | Every retained connection reports `connected == false`. |
| Open and close 20 times | Delivery count remains one per active subscriber. |
| Disconnect during callback | Remaining listeners still receive the current fire safely. |
| Clear a round | Old listeners disappear and the signal accepts new listeners. |
| Destroy the feature owner | No later publisher path uses the destroyed signal. |
| Subscriber throws | Other subscribers still run and Output identifies the failing task. |

For the complete-game version, run the lifecycle regression in
[Crystal Run](./project-crystal-run), then repeat the acceptance pass with the
HUD, feedback, analytics, and milestone subscribers enabled together.

## Keep performance evidence separate

Correctness smoke tests should have deterministic assertions. Timing depends
on Studio, hardware, listener count, callback work, and scheduler load, so run
`benchmarks/SignalStorage.bench.luau` as a separate decision guard. Compare
changes on the same machine and Studio version, and profile subscriber work
before attributing a frame problem to Echo's dispatch traversal.

Use the [performance chapter](./performance) for storage and profiling
details. A release is ready when the 13-check suite passes, the feature
regression passes, repeated teardown leaves no duplicate delivery, and the
real callback workload stays inside your frame budget.

<div className="chapter-next">
  <p><strong>Apply the verification path to a complete feature.</strong><br />Run the Crystal Run event-layer regression, then profile subscriber work under the full HUD and feedback composition.</p>
  <a href="/echo-rbx/docs/project-crystal-run/">Verify Crystal Run</a>
</div>
