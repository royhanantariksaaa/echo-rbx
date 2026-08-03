---
sidebar_position: 1.5
title: Interactive Playground
description: Run Echo signal lifecycle scenarios and watch connections, one-shot listeners, dispatch, and teardown.
hide_table_of_contents: true
---

# Echo Playground

<div className="lesson-header">
  <p className="lesson-kicker"><span className="streamline-icon streamline-icon--play" aria-hidden="true"></span> Practice lab / Chapter 4</p>
  <p className="lesson-summary">Edit a real-shaped Echo scenario and watch every connection change as the signal fires, disconnects, and reaches teardown.</p>
  <div className="lesson-progress" aria-label="Learn Echo progress: 80 percent"><span className="lesson-progress__fill lesson-progress__fill--80"></span></div>
</div>

<div className="playground-runbook" aria-label="Echo playground workflow">
  <div><span>01 / Baseline</span><strong>Run the lifecycle</strong><p>Watch persistent, one-shot, and disconnected listeners receive the same score stream.</p></div>
  <div><span>02 / Change</span><strong>Move one boundary</strong><p>Reorder Fire, Disconnect, DisconnectAll, and Destroy, then compare the trace.</p></div>
  <div><span>03 / Transfer</span><strong>Build the Studio version</strong><p>Replace browser labels with typed Luau callbacks owned by a real client feature.</p></div>
</div>

## Run the lifecycle baseline

The workspace keeps the editable signal program and its runtime state visible
together. Start with **Listener lifecycle**, then run the scenario without
changing the script.

<div className="playground-actions">
  <a className="button button--primary" href="/echo-rbx/playground/" target="_blank" rel="noreferrer">Open full screen</a>
  <a className="button button--secondary" href="/echo-rbx/docs/tutorial-score-feed/">Build it in Studio</a>
  <a className="button button--secondary" href="/echo-rbx/docs/project-crystal-run/">Continue to Crystal Run</a>
</div>

<div className="playground-frame">
  <iframe src="/echo-rbx/playground/" title="Echo signal lifecycle playground" loading="eager"></iframe>
</div>

<div className="lesson-goals">
  <strong>Expected baseline</strong>
  <ul>
    <li>HUD and Analytics are active before the first Fire.</li>
    <li>Once removes itself immediately after its first delivery.</li>
    <li>Analytics stops receiving values after its connection disconnects.</li>
    <li>Destroy ends the signal and rejects later lifecycle operations.</li>
  </ul>
</div>

## Read code and runtime together

The editor is the operation order. The runtime view is the contract made
visible: connection state, fire count, delivery count, and the exact dispatch
trace produced by each line.

| Observation | Echo rule | Production decision |
|---|---|---|
| Once disappears after one delivery | It disconnects before invoking the callback. | Use it for one-time milestones and acknowledgements. |
| Analytics stops while HUD continues | A connection owns only its subscription. | Disconnect a feature without disrupting the shared signal. |
| DisconnectAll leaves the signal reusable | Listener lifetime is shorter than signal lifetime. | Clear a phase and attach the next phase later. |
| Destroy rejects later work | Signal lifetime has ended permanently. | Destroy only when the owning feature is leaving. |

## Complete three controlled experiments

### 1. Prove one-shot re-entry safety

Select **One-shot listener**, run it once, and inspect the trace. The Once
listener receives the first value only. Add another Fire directly after the
first one and run again. Its delivery count must remain `1`.

### 2. Shorten one subscriber lifetime

Return to **Listener lifecycle** and move
`analytics:Disconnect()` above `score:Fire(10)`. HUD still receives both
values, while Analytics receives neither value after its disconnect line.
This is the ownership pattern used when telemetry, sound, and UI have
different lifetimes.

### 3. Separate clearing from destruction

Select **Bulk teardown**. First run with `DisconnectAll`, then replace that
line with `Destroy`. Clearing listeners leaves the signal available for new
connections. Destroying it ends the object itself.

## Transfer the behavior to Roblox Studio

The browser uses listener labels so the trace stays inspectable. In Studio,
those labels become typed callbacks:

```lua title="StarterPlayerScripts/ScoreFeed.client.luau"
local scored: Echo.Signal<number> = Echo.new()

local hud = scored:Connect(function(points)
    print("HUD", points)
end)

local analytics = scored:Connect(function(points)
    print("Analytics", points)
end)

scored:Once(function(points)
    print("First milestone", points)
end)

scored:Fire(5)
analytics:Disconnect()
scored:Fire(10)

hud:Disconnect()
scored:Destroy()
```

<figure className="tutorial-demo playground-proof">
  <img className="tutorial-demo__motion" src="/echo-rbx/tutorials/echo-signal-flow.gif" alt="Echo callbacks receiving score events in Roblox Studio" />
  <img className="tutorial-demo__still" src="/echo-rbx/tutorials/echo-signal-flow.png" alt="Completed Echo score signal in Roblox Studio" />
  <figcaption>The same lifecycle running with real callbacks and Studio output.</figcaption>
</figure>

Use the [Score Feed tutorial](./tutorial-score-feed) for the exact Explorer
tree, complete script, expected `65` point result, API walkthrough, and common
failure modes.

:::note Browser model versus Roblox runtime
The playground models documented connection and teardown behavior. Roblox task
scheduling and real callback execution are shown in the recorded
[Score Feed tutorial](./tutorial-score-feed).
:::

## Continue into the complete game

Crystal Run creates the shared event vocabulary once, bridges Flite network
facts into it, and lets HUD, feedback, analytics, and milestones subscribe
independently. The [complete event layer](./project-crystal-run) includes the
file tree, bridge controller, feedback controller, lifecycle regression test,
multiplayer acceptance pass, and failure paths.

<div className="chapter-next">
  <p><strong>Ready for production-shaped composition?</strong><br />Use Echo as the typed event layer between Crystal Run's network model and client features.</p>
  <a href="./project-crystal-run">Build the event layer</a>
</div>
