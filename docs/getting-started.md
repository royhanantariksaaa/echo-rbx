---
sidebar_position: 2
---

# Getting Started

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
