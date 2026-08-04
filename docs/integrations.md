---
sidebar_position: 6
---

# Integrations

<div className="lesson-header">
  <p className="lesson-kicker"><span className="streamline-icon streamline-icon--code" aria-hidden="true"></span> Production / Composition</p>
  <p className="lesson-summary">Translate external events once, publish a typed local vocabulary, and let Weave scopes, Flite controllers, Roblox connections, or cleanup utilities end only the resources they own.</p>
</div>

## Place Echo at a local boundary

Echo is useful between a producer that knows a gameplay fact and several local
features that should not depend on the producer's implementation:

```text
authoritative or engine source
  -> one adapter / controller
  -> typed Echo event hub
       -> HUD
       -> audio
       -> analytics
       -> one-shot milestone
```

The adapter owns translation. The hub owns its signals. Each subscriber owns
its connection. Keeping those responsibilities separate prevents a UI screen
from importing a network proxy or an analytics feature from clearing listeners
it does not own.

## Compose a domain hub instead of inheriting

Echo does not expose a class hierarchy intended for subclassing. Build a plain
module that contains named signals and game-specific policy:

```lua title="InventoryEvents.luau"
local Echo = require(path.to.Echo)

export type ItemDelta = {
    itemId: string,
    quantity: number,
    reason: "Pickup" | "Purchase" | "Consume",
}

export type InventoryEvents = {
    changed: Echo.Signal<ItemDelta>,
    capacityReached: Echo.Signal<number>,
    destroy: (self: InventoryEvents) -> (),
}

local InventoryEvents = {}

function InventoryEvents.new(): InventoryEvents
    local self = {
        changed = Echo.new(),
        capacityReached = Echo.new(),
    } :: any

    function self:destroy()
        self.changed:destroy()
        self.capacityReached:destroy()
    end

    return self
end

return InventoryEvents
```

This composition preserves the small Signal contract while adding vocabulary,
payload types, ownership, and one final teardown path. Add methods to the hub
only when they enforce domain policy; do not re-wrap every Echo method under a
new name.

## Integrate an external signal with Weave

When the Echo signal outlives a Weave mount, the scope owns only its returned
connection:

```lua
local scoreChanged: Echo.Signal<number> = gameEvents.scoreChanged

local cleanup = Weave.mount(playerGui, function(scope)
    local score = scope:Value(0)
    local connection = scoreChanged:connect(function(nextScore)
        score:Set(nextScore)
    end)

    scope:onCleanup(function()
        connection:disconnect()
    end)

    return scope:TextLabel {
        Text = scope:Computed(function()
            return `Score: {score:Get()}`
        end),
    }
end)
```

Unmounting the HUD disconnects the HUD only. Audio and analytics can keep
receiving the session-wide signal.

Calling `scoreChanged:disconnectAll()` from this scope would invert ownership:
one subscriber would erase unrelated subscriptions on a signal it did not
create.

## Let a Weave scope own a local signal

Sometimes a signal exists only inside one mounted feature. Then the scope can
own the signal itself:

```lua
Weave.mount(playerGui, function(scope)
    local submitted: Echo.Signal<string> = Echo.new()

    scope:onCleanup(function()
        submitted:destroy()
    end)

    local connection = submitted:connect(function(value)
        print("Submitted", value)
    end)

    scope:onCleanup(function()
        connection:disconnect()
    end)

    return buildForm(scope, submitted)
end)
```

The explicit connection cleanup is harmless even though destroying the owned
signal also clears it. Keeping both registrations documents which resource
belongs to which participant and remains safe because disconnection is
idempotent.

## Bridge Flite facts once

Flite handles framework lifecycle, replicated state, and network-facing
signals. Echo should distribute already validated facts inside the client; it
must not become a second authority layer.

```text
RoundService (server authority)
  -> Flite transport / replicated state
  -> EventBridgeController
  -> Echo phaseChanged, crystalCollected, roundEnded
```

The bridge should:

1. Resolve the Flite service once.
2. Create one client event hub.
3. Translate each external payload into the local typed vocabulary.
4. Register every upstream connection with controller cleanup.
5. Disconnect upstream publishers before destroying the Echo hub.

Flite framework signals may expose networking operations such as
`fireClient` or `fireAllClients`. Those methods are not part of a standalone
Echo signal. A local subscriber should not need to know which network method
produced the confirmed fact.

The [Crystal Run event layer](/echo-rbx/docs/project-crystal-run/) includes the
complete bridge controller, feedback controller, multiplayer acceptance pass,
and teardown order.

## Adapt Roblox events only when it adds a domain boundary

An `RBXScriptSignal` already supports multiple subscribers. Do not wrap every
engine event automatically. Translate it when you need a typed domain payload,
testable local source, or isolation from the Instance that produced it:

```lua
local pickedUp: Echo.Signal<number, Vector3> = Echo.new()

local touchedConnection = crystalPart.Touched:Connect(function(otherPart)
    local character = otherPart:FindFirstAncestorOfClass("Model")
    local player = character and Players:GetPlayerFromCharacter(character)
    if player ~= localPlayer then
        return
    end

    pickedUp:fire(crystalId, crystalPart.Position)
end)

local soundConnection = pickedUp:connect(function(_, position)
    playPickupSound(position)
end)

local function destroy()
    touchedConnection:Disconnect()
    soundConnection:disconnect()
    pickedUp:destroy()
end
```

The adapter validates and converts the engine event once. Consumers no longer
need the Part, touch filtering, or player lookup.

For authoritative rewards, the server must still validate the pickup. A local
Echo event is suitable for feedback after confirmation, not for granting
currency or trusting client contact.

## Register connections with cleanup utilities

Echo exposes both lowercase `disconnect` and PascalCase `Disconnect`. That
makes a connection compatible with cleanup tools that accept a disconnectable
object, but registration conventions differ between libraries.

Use one of these shapes:

```lua
-- Tool accepts an object and method name.
trove:Add(connection, "Disconnect")

-- Tool accepts a cleanup callback.
cleanup:Add(function()
    connection:disconnect()
end)
```

Verify the cleanup tool's exact contract instead of assuming it discovers
methods automatically. After cleanup, assert `connection.connected == false`
in a focused lifecycle test.

## Keep payloads framework-neutral

A local domain event should carry facts that every subscriber can understand:

```lua
type RoundResult = {
    score: number,
    lifetimeTotal: number,
    placement: number,
}

local roundEnded: Echo.Signal<RoundResult> = Echo.new()
```

Avoid payloads that expose the integration layer:

- a Flite service proxy;
- a Weave scope;
- a remote-event argument array;
- a UI Instance that analytics must ignore;
- a mutable controller table with unrelated methods.

Translate those details at the adapter. Framework-neutral payloads make Echo
features testable without starting networking or mounting UI.

## Build one complete composition

```lua title="PickupFeedback.luau"
local PickupFeedback = {}
PickupFeedback.__index = PickupFeedback

function PickupFeedback.new(events, renderPickup, playSound, recordAnalytics)
    return setmetatable({
        _events = events,
        _renderPickup = renderPickup,
        _playSound = playSound,
        _recordAnalytics = recordAnalytics,
        _connections = {},
        _started = false,
    }, PickupFeedback)
end

function PickupFeedback:start()
    if self._started then
        return
    end
    self._started = true

    table.insert(self._connections, self._events.crystalCollected:connect(
        function(score, crystalId, position)
            self._renderPickup(score)
            self._playSound(position)
            self._recordAnalytics(crystalId, score)
        end
    ))

    table.insert(self._connections, self._events.crystalCollected:once(
        function()
            print("First pickup this session")
        end
    ))
end

function PickupFeedback:stop()
    if not self._started then
        return
    end
    self._started = false

    for _, connection in self._connections do
        connection:disconnect()
    end
    table.clear(self._connections)
end

return PickupFeedback
```

This owner depends on an event interface and injected effects, not Flite,
Weave, or a particular Instance tree. A test can provide functions that append
to arrays, fire the hub, and verify delivery and cleanup deterministically.

## Diagnose integration mistakes

| Symptom | Boundary problem | Correction |
|---|---|---|
| HUD imports a service proxy only to hear one event | Translation is missing. | Publish one local typed fact from the bridge. |
| Closing UI stops audio and analytics | UI cleared a shared signal. | Disconnect only the UI-owned handle. |
| Every subscriber repeats remote payload parsing | Adapter is too thin. | Normalize once before `fire`. |
| Client signal appears to grant rewards | Authority is misplaced. | Validate on server; publish confirmation locally. |
| Feature restart doubles deliveries | Cleanup utility missed a handle. | Register the connection explicitly and test reopen cycles. |
| Domain hub subclasses or copies Signal internals | Policy is coupled to implementation. | Compose named Echo signals in a plain module. |
| Subscriber needs current state before any fire | Event and state roles are mixed. | Read Flite/Weave state, then subscribe to transitions. |

## Review the composition checklist

- Is there one translation point per external source?
- Does the local event name describe a fact?
- Is the payload typed and independent of the source framework?
- Does each subscriber own only its connection?
- Does the hub creator own final signal teardown?
- Are upstream publishers disconnected before the hub is destroyed?
- Can the feature be tested without networking or UI?

Use [Signals and Connections](/echo-rbx/docs/signals/) for payload and dispatch
semantics, [Lifecycle](/echo-rbx/docs/lifecycle/) for teardown and cancellation,
and [Performance](/echo-rbx/docs/performance/) when fan-out or callback work
needs measurement.
