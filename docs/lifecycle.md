---
sidebar_position: 4
---

# Lifecycle

<div className="lesson-header">
  <p className="lesson-kicker"><span className="streamline-icon streamline-icon--check" aria-hidden="true"></span> Signal semantics / Ownership</p>
  <p className="lesson-summary">Assign every signal, connection, and waiting coroutine to an owner; then make open, close, restart, and final shutdown follow one idempotent path.</p>
</div>

## Model three separate lifetimes

Most signal leaks happen because code treats these as one lifetime:

| Resource | Typical owner | Correct end operation |
|---|---|---|
| Signal | Event hub, service, controller, or feature model | Owner calls `destroy()` and releases the hub. |
| Persistent connection | The subscriber that created it | Subscriber calls `disconnect()`. |
| One-shot connection | The pending operation or milestone | It disconnects on delivery; owner may disconnect it early. |
| Waiting coroutine | The task that called `wait()` | A fire resumes it; custom cancellation must resume or abandon it deliberately. |

Creating a connection does not transfer signal ownership. A HUD that listens
to a session-wide score signal may close itself, but it must not clear audio,
analytics, or achievement subscribers attached to the same signal.

## Use the narrowest teardown

| Situation | Operation | Why |
|---|---|---|
| One screen closes | `screenConnection:disconnect()` | Ends only the screen's subscription. |
| A pending one-shot is cancelled | `pending:disconnect()` | Prevents its future callback. |
| A round resets but the event hub survives | `roundSignal:disconnectAll()` | Removes the current listener generation and allows reuse. |
| The hub owner stops permanently | `roundSignal:destroy()` | Clears listeners and communicates terminal intent. |

`destroy()` currently calls the same implementation as `disconnectAll()`.
Echo does not mark the signal unusable, throw on later `connect`, or reject
later `fire` calls. Treating it as terminal is an ownership convention in your
architecture, not a runtime guard supplied by Echo.

## Retain every owned connection

A small connection bag is enough for many features:

```lua
local connections: { Echo.Connection<any> } = {}

local function own(connection)
    table.insert(connections, connection)
    return connection
end

own(scoreChanged:connect(renderScore))
own(roundEnded:connect(showResults))

local function disconnectOwned()
    for _, connection in connections do
        connection:disconnect()
    end
    table.clear(connections)
end
```

Because `disconnect` is idempotent, `disconnectOwned()` is safe during normal
close, error recovery, and a second defensive close. If your cleanup library
recognizes objects with `Disconnect`, Echo's PascalCase alias can be registered
directly; otherwise register a closure that calls lowercase `disconnect`.

## Make feature start and stop idempotent

Repeated mounts are a better ownership test than one successful delivery:

```lua title="ScoreFeedController.luau"
local ScoreFeedController = {}
ScoreFeedController.__index = ScoreFeedController

function ScoreFeedController.new(scoreChanged)
    return setmetatable({
        _scoreChanged = scoreChanged,
        _connection = nil,
        _started = false,
    }, ScoreFeedController)
end

function ScoreFeedController:start()
    if self._started then
        return
    end
    self._started = true

    self._connection = self._scoreChanged:connect(function(score)
        print("HUD score", score)
    end)
end

function ScoreFeedController:stop()
    if not self._started then
        return
    end
    self._started = false

    if self._connection then
        self._connection:disconnect()
        self._connection = nil
    end
end

return ScoreFeedController
```

Run `start`, `stop`, and `start` again in a test. One fire should produce one
HUD delivery, not two. This catches the common case where a previous mount left
an invisible listener behind.

## Cancel a one-shot before it happens

`once` returns a normal connection handle. The automatic path disconnects
before invoking the callback; the owner can also cancel it first:

```lua
local pendingRound = roundStarted:once(function(roundId)
    enterRound(roundId)
end)

local function leaveQueue()
    pendingRound:disconnect()
end
```

Check `pendingRound.connected` only for diagnostics. Do not use polling as the
primary control flow; keep cancellation in the owner that knows the queue was
left.

## Understand plain `wait`

`wait()` must run in a yieldable coroutine:

```lua
task.spawn(function()
    local player, score = scored:wait()
    print(player.Name, score)
end)
```

Internally, Echo creates a one-shot connection and yields. The next fire
disconnects that subscription before resuming the waiting thread with all
payload arguments.

There are two lifecycle consequences:

1. `wait()` has no timeout or cancellation return value.
2. `disconnectAll()` or `destroy()` removes the hidden one-shot connection but
   does not resume the waiting coroutine.

Do not use plain `wait()` in a task whose owner can disappear first unless an
indefinitely suspended coroutine is acceptable.

## Build a cancellable wait

Own the connection and timeout together when either delivery or teardown may
win:

```lua
local function waitForNext(signal, timeoutSeconds)
    local waitingThread = coroutine.running()
    local settled = false
    local connection
    local timeoutThread

    connection = signal:connect(function(...)
        if settled then
            return
        end
        settled = true
        connection:disconnect()

        if timeoutThread then
            task.cancel(timeoutThread)
        end

        task.spawn(waitingThread, true, ...)
    end)

    timeoutThread = task.delay(timeoutSeconds, function()
        if settled then
            return
        end
        settled = true
        connection:disconnect()
        task.spawn(waitingThread, false, "timeout")
    end)

    return coroutine.yield()
end

task.spawn(function()
    local received, phaseOrReason, seconds = waitForNext(phaseChanged, 10)
    if not received then
        warn(phaseOrReason)
        return
    end

    print("phase", phaseOrReason, seconds)
end)
```

For feature shutdown, use the same settled guard: disconnect the connection,
cancel the timeout task when possible, and resume the owner with an explicit
`"cancelled"` result. A Promise or the framework's cancellation primitive may
be a better fit when this pattern repeats.

## Choose clear versus destroy explicitly

```lua
roundEvents:disconnectAll()

roundEvents:connect(bindNextRound)
roundEvents:fire("Lobby") -- supported reuse
```

The same sequence technically works after `destroy()`, but production code
should not do it. Let the owner release the signal reference after final
teardown so accidental reuse becomes structurally difficult:

```lua
function MatchSession:destroy()
    if self._destroyed then
        return
    end
    self._destroyed = true

    self.events:destroy()
    self.events = nil
end
```

Use a wrapper guard like `_destroyed` when terminal behavior must be enforced.
Echo intentionally keeps that policy out of the primitive.

## Teardown producers before the hub

A bridge has two directions of ownership: upstream connections feed the hub,
and downstream connections consume it. Final shutdown should prevent new
publishing before clearing subscribers:

1. Mark the owner stopping so no new work starts.
2. Disconnect Roblox or Flite connections that publish into Echo.
3. Stop feature subscribers and cancel pending work.
4. Call `destroy()` on the owned Echo signals.
5. Release references to the hub and captured feature state.

```lua
function EventBridge:destroy()
    if self._destroyed then
        return
    end
    self._destroyed = true

    for _, upstream in self._upstreamConnections do
        upstream:Disconnect()
    end
    table.clear(self._upstreamConnections)

    self.events:destroy()
    self.events = nil
end
```

This order closes the publishing path before the subscriber list disappears.
It also makes a late upstream callback fail at the guarded owner boundary
instead of quietly reviving a feature after shutdown.

## Release captured objects

A connected callback can retain every value in its closure: UI Instances,
controllers, player state, and large tables. Echo clears the callback field
when a connection ends, but it cannot decide when the owner should disconnect.

Audit retention when:

- a screen is opened and closed repeatedly;
- a player or character is replaced;
- a round-specific feature survives into the next round;
- Studio memory grows after the visible UI is gone.

Use the returned handle as the concrete edge in that ownership graph. Avoid
anonymous long-lived subscriptions whose handle is immediately discarded.

## Diagnose lifecycle failures

| Symptom | Likely ownership error | Check |
|---|---|---|
| A callback runs twice after reopening | Previous connection survived. | Run repeated start/stop cycles and inspect retained handles. |
| Closing one feature silences all others | Subscriber called `disconnectAll`. | Disconnect only the feature-owned connection. |
| A waiting task never resumes | Signal was cleared before a fire. | Use cancellable wait and explicit shutdown result. |
| A handle says connected after owner shutdown | Teardown path missed it. | Assert every retained handle becomes `false`. |
| Events arrive while the bridge is stopping | Producer disconnected too late. | Stop upstream publishers before destroying the hub. |
| Post-destroy code still works | Echo does not enforce terminal state. | Guard and release the owner reference. |

## Test the ownership contract

A feature-level lifecycle test should cover more than delivery:

- start twice without duplicating subscriptions;
- disconnect the same handle twice;
- stop before a one-shot fires;
- clear a reusable phase and attach the next generation;
- destroy the owner and verify no publisher path retains its hub;
- repeat open/close twenty times and keep one delivery per active subscriber.

The [Testing and Debugging chapter](/echo-rbx/docs/testing-and-debugging/)
contains a runnable harness. The
[Crystal Run event layer](/echo-rbx/docs/project-crystal-run/) shows separate
bridge and feedback owners with their teardown order visible side by side.
