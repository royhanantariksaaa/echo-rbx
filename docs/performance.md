---
sidebar_position: 5
---

# Performance

<div className="lesson-header">
  <p className="lesson-kicker"><span className="streamline-icon streamline-icon--code" aria-hidden="true"></span> Production / Profiling</p>
  <p className="lesson-summary">Measure listener storage, scheduler work, callback cost, churn, and retention separately; then optimize the part that actually consumes the frame instead of assuming a signal primitive is the bottleneck.</p>
</div>

Echo uses `--!native` and `--!optimize 2`. Those directives help Luau execute
the module efficiently, but the architecture of the workload matters more than
the directives.

## Use the real cost model

| Operation | Structural cost | Additional work |
|---|---|---|
| `Echo.new()` | O(1) | Allocate one signal table. |
| `connect()` | O(1) | Allocate a connection node and append it to the tail. |
| `disconnect()` | O(1) | Relink known neighbors and clear node references. |
| `once()` | O(1) connect | Allocate its wrapper callback; disconnect on delivery. |
| `fire()` | O(n) listeners | One scheduler resume per connected callback plus callback work. |
| `disconnectAll()` | O(n) listeners | Mark each handle disconnected and clear each node. |
| `destroy()` | O(n) listeners | Exact same runtime work as `disconnectAll()`. |

Memory is O(n) for active connections. The public handles are intentionally
stable and are not recycled into future subscriptions.

For most games, the cost of what subscribers do is much larger than walking a
small listener list. A signal with five callbacks that each rebuild UI, raycast,
or serialize analytics is not a five-listener storage problem.

## Understand the linked-list tradeoff

Echo stores listeners as a doubly linked list with head and tail pointers.

**What it buys:**

- append in constant time;
- removal of a known connection in constant time;
- no array shifting when listeners churn;
- stable public handles;
- safe access to a saved next node when the current callback disconnects.

**What it costs:**

- each node stores previous and next references;
- traversal follows table references instead of contiguous numeric slots;
- allocation locality is controlled by Luau and Roblox, not Echo;
- bulk traversal is still linear.

A dense array can have better sequential traversal locality, but direct removal
usually leaves holes, needs an index map, or pays for compaction. There is no
universally superior representation; workload shape decides.

## Know what the runner reuses

Echo maintains one module-level free runner coroutine slot. Before user code
runs, that slot is cleared. When a non-yielding callback finishes normally, its
runner can return to the slot for later delivery.

This design has useful consequences:

- a nested `fire` cannot resume the coroutine already running user code;
- a yielding callback keeps its runner busy, so another delivery allocates or
  uses a different runner;
- many concurrently yielding listeners require more runners;
- an errored runner does not complete the normal return-to-slot path.

"Coroutine reuse" does not mean one callback thread serves all listeners at the
same time, and it does not remove the `task.spawn` scheduling boundary.

## Separate dispatch from callback cost

Profile at least these layers:

| Layer | Question | Useful measurement |
|---|---|---|
| Publish frequency | How often is this event fired? | Fires per second and bursts per frame |
| Fan-out | How many listeners are active? | Mean, peak, and unexpected duplicates |
| Echo traversal | How long does `fire` itself occupy? | Custom profiler label around `fire` |
| Callback body | Which subscriber spends time? | One label per expensive subscriber |
| Yielding work | How many callbacks remain in flight? | Concurrent tasks and completion latency |
| Churn | How often are nodes connected and removed? | Connect/disconnect pairs per lifecycle |
| Retention | What survives teardown? | Handles, captured Instances, and memory after reopen cycles |

Roblox's [MicroProfiler](https://create.roblox.com/docs/performance-optimization/microprofiler)
supports custom labels with `debug.profilebegin()` and `debug.profileend()`:

```lua
debug.profilebegin("CrystalRun publish pickup")
events.crystalCollected:fire(score, crystalId)
debug.profileend()

events.crystalCollected:connect(function(nextScore, nextCrystalId)
    debug.profilebegin("CrystalRun pickup HUD")
    updatePickupHud(nextScore, nextCrystalId)
    debug.profileend()
end)
```

Keep custom profile regions balanced and preferably non-yielding. Label the
publisher and expensive subscribers separately so a slow HUD callback is not
misdiagnosed as linked-list traversal.

## Run the storage benchmark correctly

`benchmarks/SignalStorage.bench.luau` compares a linked list with a dense array
that compacts removed entries at 8, 64, and 512 listeners:

```sh
luau benchmarks/SignalStorage.bench.luau
```

It measures two synthetic workloads:

- steady traversal through no-op callbacks;
- repeated disconnect/reconnect churn.

On the development run, steady traversal was comparable while the dense array
was roughly 1.6 to 2.0 times slower under churn. That result is evidence for
the storage decision under that benchmark, not a universal speed claim for
every Roblox device or real callback workload.

When changing the benchmark:

1. Warm both implementations before timing.
2. Keep callback bodies identical.
3. Run several listener counts, not only a large stress case.
4. Separate steady dispatch from mutation.
5. Report elapsed time and operation count together.
6. Compare on the target Studio/client environment before changing production
   architecture.

Do not add a machine-specific timing threshold to correctness tests. A slow CI
worker should not make signal semantics fail.

## Be precise about SIMD

SIMD helps when one instruction can process multiple homogeneous numeric
values. Echo dispatch instead performs pointer traversal, dynamic callback
lookup, scheduler interaction, and arbitrary user code. Those operations are
branchy and heterogeneous.

Portable Luau code does not expose a direct SIMD lane API for rewriting this
listener traversal. Even if numeric vectorization were available elsewhere,
the callback boundary would remain the dominant mismatch. SIMD is a good fit
inside a subscriber that processes a large numeric dataset, not around the
signal that announces the work.

## Be precise about L1, L2, L3, and L4 caches

Roblox and Luau do not provide portable APIs for pinning signal nodes to a CPU
cache level or controlling cache-line placement. "L4" is not even a uniform
consumer CPU resource. Echo can influence data shape, allocation count, and
traversal count; the VM, allocator, operating system, and processor decide
physical cache placement.

The practical cache discussion is therefore comparative:

| Representation | Likely advantage | Likely cost |
|---|---|---|
| Linked nodes | O(1) known-node removal and no compaction | Pointer chasing and per-node fields |
| Dense array | Sequential traversal and fewer neighbor fields | Removal bookkeeping, holes, or compaction |
| Copy-on-fire array | Stable snapshot semantics | O(n) allocation/copy per dispatch |

Echo chooses linked nodes because connection churn and stable handles are part
of its contract. Change that choice only with representative profile evidence
and regression tests for mutation semantics.

## Optimize the event architecture first

Use this order before editing the primitive:

1. Remove duplicate subscriptions caused by repeated mounts.
2. Reduce event frequency when the publisher emits redundant intermediate
   values.
3. Move expensive work out of callbacks or coalesce it once per frame.
4. Split a generic high-fan-out bus into domain signals with relevant
   subscribers only.
5. Avoid publishing large mutable tables that every subscriber copies again.
6. Measure yielding callbacks and background work separately from dispatch.
7. Re-run the storage benchmark only if connect/disconnect churn remains a
   measured hotspot.

Examples:

- Publish `scoreChanged` only when score actually changes, not every Heartbeat.
- Store current phase in reactive state and signal the transition, rather than
  replaying the same phase continuously.
- Have one analytics subscriber batch records instead of spawning one network
  operation per pickup.
- Let one UI owner derive display details instead of attaching many tiny
  subscribers to the same high-frequency event.

## Profile Crystal Run as a system

For the [complete event layer](/echo-rbx/docs/project-crystal-run/), capture:

| Scenario | Evidence to record |
|---|---|
| Lobby idle | Baseline listener count and zero unexpected pickup fires |
| Pickup burst | Peak fires per frame, callback labels, and in-flight tasks |
| Round transition | Connection churn and duplicate deliveries |
| Results screen | Expensive UI/analytics callbacks after `roundEnded` |
| Twenty restart cycles | Stable listener count and retained memory |
| Subscriber failure | Other callbacks still run; failed task is visible in Output |

The [Testing and Debugging chapter](/echo-rbx/docs/testing-and-debugging/)
keeps semantic tests separate from timing evidence. Preserve that separation:
correctness answers *whether* a callback should run; profiling answers *where*
the time and allocations went.
