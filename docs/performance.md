---
sidebar_position: 5
---

# Performance

<div className="lesson-header">
  <p className="lesson-kicker"><span className="streamline-icon streamline-icon--code" aria-hidden="true"></span> Production / Profiling</p>
  <p className="lesson-summary">Understand the linked-list storage choice, the scheduler boundary, and which measurements matter before changing signal architecture.</p>
</div>

Echo uses `--!native` and `--!optimize 2`, but its important performance choice
is the listener data structure.

## Linked listener storage

- Connect appends in O(1) through head and tail pointers.
- Disconnect removes a known node in O(1).
- Fire performs one forward traversal.
- Dispatch saves the next node before scheduling user code, so callbacks can
  disconnect themselves safely.
- A completed non-yielding runner thread can be reused by later dispatches.

Public connection pooling is intentionally avoided because recycling a handle
could let stale user code mutate an unrelated subscription.

## Benchmark

`benchmarks/SignalStorage.bench.luau` compares Echo's linked list with a dense
array that compacts removed entries. It measures steady dispatch and repeated
disconnect/reconnect churn at 8, 64, and 512 listeners.

```sh
luau benchmarks/SignalStorage.bench.luau
```

On the development benchmark, steady traversal was comparable while the dense
array was roughly 1.6 to 2.0 times slower under churn. Keep the benchmark as a
decision guard, not as a universal timing promise.

## SIMD and cache locality

Signal dispatch is pointer traversal plus dynamic callback invocation, not
homogeneous numeric work. Luau exposes neither portable SIMD intrinsics nor
direct L1/L2/L3/L4 placement controls. Echo keeps nodes small and traverses
once, then lets profiling decide whether callback work or scheduling dominates.

## Profile Crystal Run

Use the [complete event layer](./project-crystal-run) to measure subscriber
count, event frequency, callback duration, and allocation separately. Optimize
the callback doing the work before replacing a stable dispatch boundary.
