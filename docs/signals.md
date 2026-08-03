---
sidebar_position: 3
---

# Signals and Connections

## Signal API

| Primary method | Alias | Behavior |
|---|---|---|
| `connect(callback)` | `Connect` | Adds a persistent listener and returns a connection. |
| `once(callback)` | `Once` | Disconnects before invoking the listener once. |
| `wait()` | `Wait` | Yields until the next fire and returns its arguments. |
| `fire(...)` | `Fire` | Schedules current listeners without yielding the caller. |
| `disconnectAll()` | `DisconnectAll` | Clears active listeners while keeping the signal reusable. |
| `destroy()` | `Destroy` | Lifecycle alias of `disconnectAll`. |

See the generated [`Signal` API](../api/Signal) for signatures.

## Connection API

Every subscription returns a stable connection object:

```lua
local connection = signal:connect(callback)

print(connection.connected) -- true
connection:disconnect()
print(connection.connected) -- false
```

`disconnect` is idempotent. Echo does not recycle public connection handles,
so a stale reference can never disconnect a later listener.

## Dispatch model

Echo traverses listeners in connection order and schedules each callback with
`task.spawn`. The caller does not yield, and one yielding listener does not
block the others.

```lua
signal:connect(function()
    task.wait(1)
    print("slow listener completed")
end)

signal:connect(function()
    print("independent listener started")
end)

signal:fire()
print("fire returned")
```

Scheduling order is defined; asynchronous completion order is not.

## Re-entrant dispatch

`once` removes its connection before invoking user code. A listener can fire
the same signal recursively without causing a once-listener to run twice.

```lua
signal:once(function(value)
    if value == 1 then
        signal:fire(2)
    end
end)

signal:fire(1)
```
