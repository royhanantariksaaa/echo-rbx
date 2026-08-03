---
sidebar_position: 2
---

# Getting Started

<div className="lesson-header">
  <p className="lesson-kicker"><span className="streamline-icon streamline-icon--book" aria-hidden="true"></span> Core lesson / Chapter 2</p>
  <p className="lesson-summary">Install Echo, create a typed signal, subscribe safely, and release the connection when its owner is done.</p>
  <div className="lesson-progress" aria-label="Learn Echo progress: 40 percent"><span className="lesson-progress__fill lesson-progress__fill--40"></span></div>
</div>

<div className="lesson-goals">
  <strong>You will build</strong>
  <ul>
    <li>A signal shared by strongly typed publishers and subscribers.</li>
    <li>A connection with an explicit lifetime.</li>
    <li>The foundation used by both the score feed and Crystal Run event hub.</li>
  </ul>
</div>

## Installation

Place Echo at `ReplicatedStorage.Libraries.Echo`. The repository's Rojo project
maps the package root directly to the public ModuleScript.

```lua
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Echo = require(ReplicatedStorage.Libraries.Echo)
```

## First signal

```lua
local scored = Echo.new()

local connection = scored:connect(function(player, points)
    print(player.Name, points)
end)

scored:fire(game.Players.LocalPlayer, 10)
connection:disconnect()
```

Use either lowercase methods or their Roblox-style PascalCase aliases:

```lua
local connection = scored:Connect(function(points)
    print(points)
end)

scored:Fire(25)
connection:Disconnect()
```

## Typed signals

```lua
type ScoreSignal = Echo.Signal<Player, number>

local scored: ScoreSignal = Echo.new()
```

The generic argument pack is shared by `connect`, `once`, `wait`, and `fire`.

<div className="chapter-next">
  <p><strong>Next: build one feature completely.</strong><br />Create a Studio score feed with persistent listeners, one-time delivery, and teardown.</p>
  <a href="./tutorial-score-feed">Build the score feed</a>
</div>
