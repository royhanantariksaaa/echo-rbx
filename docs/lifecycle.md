---
sidebar_position: 4
---

# Lifecycle

## Disconnect what you own

Store the returned connection near the resource that owns it and disconnect it
during teardown.

```lua
local connections = {}

table.insert(connections, changed:connect(onChanged))
table.insert(connections, removed:connect(onRemoved))

local function destroy()
    for _, connection in connections do
        connection:disconnect()
    end
    table.clear(connections)
end
```

For owner systems such as Trove or a Weave scope, register the connection
object directly when the owner recognizes `Disconnect` or `disconnect`.

## Waiting

`wait` must run from a yieldable thread:

```lua
task.spawn(function()
    local player, score = scored:wait()
    print(player.Name, score)
end)
```

The wait subscription removes itself before resuming the waiting thread.

## Clearing and reuse

`disconnectAll` marks all current handles disconnected. New listeners may be
added afterward:

```lua
signal:disconnectAll()

signal:connect(nextListener)
signal:fire("still reusable")
```

`destroy` currently has the same runtime behavior. Use it to communicate
terminal ownership, but do not depend on it rejecting future connections.

:::caution
Handler errors occur inside spawned tasks. Wrap callbacks in `pcall` when an
owner needs centralized error reporting or recovery.
:::
