---
sidebar_position: 6
---

# Integrations

<div className="lesson-header">
  <p className="lesson-kicker"><span className="streamline-icon streamline-icon--code" aria-hidden="true"></span> Production / Composition</p>
  <p className="lesson-summary">Place Echo at local feature boundaries, then let Weave scopes or Flite owners control connection lifetime without coupling subscribers together.</p>
</div>

## Weave cleanup

```lua
local bus = Echo.new()

Weave.mount(playerGui, function(scope)
    scope:OnDestroy(function()
        bus:disconnectAll()
    end)

    return scope:TextButton {
        Text = "Emit",
        [Weave.OnEvent("Activated")] = function()
            bus:fire("button-pressed", os.clock())
        end,
    }
end)
```

If the signal outlives the scope, disconnect only the scope-owned connection
instead of clearing every listener.

## Flite signals

Flite composes Echo behind local framework events and state observers. A Flite
framework signal adds network methods such as `fireClient` and
`fireAllClients`; those methods do not belong to a standalone Echo signal.

```text
Echo
  local asynchronous signal dispatch
    -> Weave subscriptions and cleanup
    -> Flite framework events and state observation
```

Keep business event payloads typed at the boundary:

```lua
type InventoryChanged = Echo.Signal<Player, string, number>

local inventoryChanged: InventoryChanged = Echo.new()
```

## In Crystal Run

The [complete event layer](./project-crystal-run) translates Flite signals
once, publishes typed Echo events, and lets the Weave HUD consume those events
without importing the service proxy.
