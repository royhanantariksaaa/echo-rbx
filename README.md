# Echo

A lean, extremely fast, pure-Luau signal implementation.

Utilizes a doubly-linked list for O(1) connection/disconnection and thread
pooling for zero-yield instant execution. Based on fast-signal patterns.

Echo is a leaf primitive with **zero dependencies** — it's consumed by
[Weave](https://github.com/royhanantariksaaa/weave-rbx) (reactive UI) and
[Flite](https://github.com/royhanantariksaaa/flite-rbx) (game framework) as
their underlying event/signal layer.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [Echo.new()](#echonew)
  - [Signal Methods](#signal-methods)
  - [Connection](#connection)
- [How It Works](#how-it-works)
- [Integration with Weave & Flite](#integration-with-weave--flite)

---

## Installation

### As a git submodule

From your game repo root (assuming `src/Shared` maps to `ReplicatedStorage`):

```sh
git submodule add https://github.com/royhanantariksaaa/echo-rbx.git src/Shared/Libraries/Echo
```

This lands Echo at `ReplicatedStorage.Libraries.Echo`, which is what Weave and
Flite expect.

### Standalone dev

Open the project in [Rojo](https://rojo.space):

```sh
rojo serve default.project.json
```

---

## Quick Start

```lua
local Echo = require(ReplicatedStorage.Libraries.Echo)

-- Create a signal
local signal = Echo.new()

-- Connect a handler
local connection = signal:connect(function(name, score)
    print(name, "scored", score)
end)

-- Fire it
signal:fire("Alice", 42)  --> Alice scored 42

-- Disconnect when done
connection:disconnect()

-- One-shot listener
signal:once(function(msg)
    print("first:", msg)
end)
signal:fire("hello")  --> first: hello
signal:fire("world")  -- (nothing — already disconnected)

-- Yield until the next fire
task.spawn(function()
    local args = signal:wait()
    print("resumed with:", args)
end)
signal:fire("resumed")
```

---

## API Reference

### Echo.new()

```lua
local signal: Echo.Signal = Echo.new()
```

Creates and returns a new Signal.

### Signal Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `:connect(fn)` | `(handler: (...any) -> ()) -> Connection` | Subscribe a handler invoked on every `:fire`. Returns a `Connection` to disconnect later. |
| `:once(fn)` | `(handler: (...any) -> ()) -> Connection` | Like `:connect`, but auto-disconnects after the first invocation. |
| `:wait()` | `() -> ...any` | **Yields** the current thread until the next `:fire`, then returns the fired arguments. |
| `:fire(...)` | `(...any) -> ()` | Dispatches arguments to every connected handler. Non-yielding; errors in one handler are isolated. |
| `:disconnectAll()` | `() -> ()` | Disconnects every active handler. The signal remains usable afterward. |
| `:destroy()` | `() -> ()` | Equivalent to `:disconnectAll()`. Convention method — don't use the signal after this. |

### Connection

| Field/Method | Type | Description |
|--------------|------|-------------|
| `.connected` | `boolean` | `true` until `:disconnect()` is called (or auto-disconnected by `:once`). |
| `:disconnect()` | `() -> ()` | Severs the subscription. Safe to call multiple times. |

---

## How It Works

**Linked-list connections:** Each connection is a node in a doubly-linked list
owned by the signal. Connect and disconnect are both O(1) — no array scanning,
no table rehashing.

**Thread pooling:** A single runner thread is created on first `:fire` and
reused for subsequent handlers via `coroutine.yield`/`task.spawn` ping-pong.
This avoids the overhead of creating a new coroutine per handler invocation.

**Error isolation:** Each handler runs in its own `task.spawn` context, so an
error in one handler does not propagate to the caller of `:fire` or interrupt
other handlers.

---

## Integration with Weave & Flite

Echo is designed as a drop-in signal primitive that other libraries build on:

### With Weave

Weave uses Echo internally for its reactive engine — every state change fires
through an Echo signal, and `scope:watch`, `scope:observe`, computed
dependencies, and the reconciler's binding system all subscribe via Echo.

You don't need to `require` Echo directly when using Weave. However, if you
want a standalone signal inside a Weave component (e.g., a custom event bus),
Echo is available at the same path:

```lua
local Echo = require(ReplicatedStorage.Libraries.Echo)
local Weave = require(ReplicatedStorage.Libraries.Weave)

local bus = Echo.new()

Weave.mount(PlayerGui, function(scope)
    scope:onCleanup(function()
        bus:disconnectAll()
    end)

    return scope:TextButton {
        Text = "Emit",
        [Weave.OnEvent "Activated"] = function()
            bus:fire("button-pressed", os.clock())
        end,
    }
end)
```

### With Flite

Flite uses Echo for server-side `FrameworkSignal` (the base of `MapState`,
`ValueState`, etc.) and for the local `DomainBus` event system. Flite signals
exposed via `self:useSignal("EventName")` wrap Echo signals with network
replication.

```lua
-- Flite service (server)
Flite.createService("NotificationService", function(self)
    local notify = self:useSignal("Notify")

    self:onPlayerAdded(function(player)
        notify:fireAllClients(player.Name .. " joined!")
    end)
end)

-- Flite controller (client)
Flite.createController("NotificationController", function(self)
    local notifyService = self:useService("NotificationService")

    notifyService.Notify:connect(function(message)
        print("Notification:", message)
    end)
end)
```

### All three together

When Echo + Weave + Flite are combined, the dependency chain is:

```
Echo (signals)
 └─ Weave (reactivity + UI, built on Echo)
     └─ Flite (game framework, built on Weave + Echo)
```

Flite controllers each receive a **Weave scope** (via `ScopeExtensions`), so
you get Flite's networking hooks + Weave's full reactive UI toolkit in one
place. Echo quietly powers the reactivity under both layers.

---

## License

[MIT](./LICENSE).
