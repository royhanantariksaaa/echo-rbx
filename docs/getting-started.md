---
sidebar_position: 2
title: Getting Started
description: Install Echo at its required Roblox path, verify the package in Studio, and build a typed score signal with explicit ownership.
---

# Getting Started

<div className="lesson-header">
  <p className="lesson-kicker"><span className="streamline-icon streamline-icon--book" aria-hidden="true"></span> Core lesson / Chapter 2</p>
  <p className="lesson-summary">Install Echo at the path its consumers expect, prove the package loads, then build a typed score signal whose listeners have deliberate lifetimes.</p>
  <div className="lesson-progress" aria-label="Learn Echo progress: 40 percent"><span className="lesson-progress__fill lesson-progress__fill--40"></span></div>
</div>

<div className="lesson-goals">
  <strong>You will build</strong>
  <ul>
    <li>A verified Echo installation under <code>ReplicatedStorage.Libraries</code>.</li>
    <li>A typed score signal with persistent and one-time subscribers.</li>
    <li>An explicit teardown path that cannot disconnect a later listener by accident.</li>
  </ul>
</div>

## Before you start

You need a Roblox place synced from a filesystem project or an equivalent
package layout in Studio. Echo is dependency-free and can run from server,
client, or shared code.

The runtime path is part of the setup contract:

```text
ReplicatedStorage
`- Libraries
   `- Echo        ModuleScript package
ServerScriptService
|- EchoSetupCheck.server.luau
`- ScoreFeed.server.luau
```

Code in this handbook requires Echo from
`ReplicatedStorage.Libraries.Echo`. If your source tree uses a different
folder name, change either the Rojo mapping or every require consistently.

## Install Echo

From a game repository where `src/Shared` maps to `ReplicatedStorage`, add
Echo as a submodule:

```sh
git submodule add https://github.com/royhanantariksaaa/echo-rbx.git src/Shared/Libraries/Echo
git submodule update --init --recursive
```

Sync the game project with Rojo. For standalone development inside the Echo
repository, its project file maps `src` directly to the required package path:

```sh
rojo serve default.project.json
```

Echo has no runtime dependencies. Do not place a second copy inside the Echo
ModuleScript; every consumer should resolve the same package instance.

## Verify the package first

Create this temporary server script before writing feature code:

```lua title="ServerScriptService/EchoSetupCheck.server.luau"
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local libraries = ReplicatedStorage:WaitForChild("Libraries")
local echoModule = libraries:WaitForChild("Echo")

local loaded, Echo = pcall(require, echoModule)
assert(loaded, `Echo failed to load: {Echo}`)
assert(type(Echo.new) == "function", "Echo.new is missing from the package")

local probe = Echo.new()
probe:Destroy()

print("[Echo setup] ready")
```

Press **Play** and confirm Output contains:

```text
[Echo setup] ready
```

This isolates installation failures from signal behavior. Remove the probe
script after it passes.

## Build a typed score signal

Create one server script. The delayed fire makes the result visible during a
single-player Studio test without needing another system first.

```lua title="ServerScriptService/ScoreFeed.server.luau"
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Echo = require(ReplicatedStorage.Libraries.Echo)

type ScoreChanged = Echo.Signal<Player, number>

local scoreChanged: ScoreChanged = Echo.new()

local feedConnection = scoreChanged:Connect(function(player, score)
    print(`[Score feed] {player.Name} = {score}`)
end)

scoreChanged:Once(function(player, score)
    print(`[First score] {player.Name} reached {score}`)
end)

local function simulateRound(player: Player)
    task.wait(1)
    scoreChanged:Fire(player, 10)
    scoreChanged:Fire(player, 25)
end

Players.PlayerAdded:Connect(function(player)
    task.spawn(simulateRound, player)
end)

game:BindToClose(function()
    feedConnection:Disconnect()
    scoreChanged:Destroy()
end)
```

Start a one-player test. Output should contain two score-feed lines and one
first-score line. Echo traverses listeners in connection order, but each
callback starts through Roblox task scheduling, so callback completion order
is not a synchronization guarantee.

## Follow the lifecycle

| Line | What Echo owns | What your feature owns |
|---|---|---|
| `Echo.new()` | An empty signal and its listener list. | The `scoreChanged` reference. |
| `Connect(callback)` | One stable connection node. | The returned connection handle. |
| `Once(callback)` | A node that removes itself before callback execution. | The callback's side effects. |
| `Fire(player, score)` | Scheduling all listeners present for that traversal. | The meaning and validity of the payload. |
| `Disconnect()` | Idempotent removal of one listener. | Choosing when that listener's owner ends. |
| `Destroy()` | Clearing every current listener. | Treating the signal as terminal afterward. |

`Fire` does not wait for callbacks and does not return their results. Use a
direct function call, Promise, or another request-response boundary when the
publisher needs an answer before continuing.

## Keep ownership explicit

Use the narrowest cleanup operation that matches the owner:

- A UI controller that subscribed to someone else's signal disconnects its
  own connection.
- A feature that owns several listeners may call `DisconnectAll` while keeping
  the signal available for a later round.
- The object that created the signal calls `Destroy` when the whole object is
  done.
- Store every long-lived connection. A connection you do not retain cannot be
  ended individually later.

Public connection handles are never recycled. Calling `Disconnect` again on
an old handle is safe and cannot affect a replacement listener.

## Diagnose common setup failures

| Symptom | Cause | Fix |
|---|---|---|
| `Echo is not a valid member of Folder Libraries` | The package is absent or mapped under another name. | Match the Explorer tree above before changing feature code. |
| `Requested module experienced an error while loading` | The mapped package root is not Echo's `src` ModuleScript. | Point the Echo package entry at the repository's `src` directory. |
| No callback output | The signal fired before the listener connected, or the test ended before delayed work ran. | Connect first and keep the play session open past the delayed fire. |
| `LocalPlayer` is `nil` | Client-only player access was used from a server Script. | Use the callback's `Player` on the server or move UI work to a LocalScript. |
| `wait` cannot yield | `Wait()` was called from a non-yieldable execution path. | Call it from a task or coroutine that is allowed to yield. |

## Check your result

- The setup probe prints exactly once without warnings.
- The persistent listener receives both fires.
- The one-time listener receives only the first fire.
- The signal payload is checked as `Player, number` by Luau tooling.
- The connection and signal each have an identifiable owner.

<div className="chapter-next">
  <p><strong>Next: build one feature completely.</strong><br />Turn this signal into a Studio score feed with HUD, analytics, milestones, reconnection, and teardown.</p>
  <a href="/echo-rbx/docs/tutorial-score-feed/">Build the score feed</a>
</div>
