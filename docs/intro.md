---
sidebar_position: 1
slug: /intro
---

# Echo

Echo is a small typed Luau signal library for Roblox. It provides asynchronous
dispatch, stable connection handles, idempotent teardown, and lowercase APIs
with complete PascalCase compatibility aliases.

<figure className="tutorial-demo intro-demo">
  <img className="tutorial-demo__motion" src="/echo-rbx/tutorials/echo-signal-flow.gif" alt="Echo signal subscribers receiving score events in Roblox Studio" />
  <img className="tutorial-demo__still" src="/echo-rbx/tutorials/echo-signal-flow.png" alt="Echo score signal tutorial result" />
  <figcaption>Independent subscribers, one-shot delivery, and explicit teardown in a real Studio run.</figcaption>
</figure>

## Choose your path

<div className="learning-path">
  <a className="learning-path__item" href="/echo-rbx/docs/playground/"><span>01 / Experiment</span><strong>Run the signal lab</strong><small>Edit fires and listeners with instant lifecycle feedback.</small></a>
  <a className="learning-path__item" href="/echo-rbx/docs/tutorial-score-feed/"><span>02 / Build</span><strong>Make a score feed</strong><small>Follow the recorded Roblox Studio tutorial end to end.</small></a>
  <a className="learning-path__item" href="/echo-rbx/api/Echo/"><span>03 / Ship</span><strong>Check the API</strong><small>Confirm signatures, aliases, dispatch rules, and cleanup.</small></a>
</div>

## Why Echo

- **Small surface:** one constructor, one signal type, and one connection type.
- **Safe handles:** disconnected connections are never recycled into unrelated
  subscriptions.
- **Predictable dispatch:** each listener runs independently through Roblox's
  task scheduler.
- **Churn-friendly storage:** connect and disconnect are constant-time.

New to Echo? Start in the [interactive playground](playground), continue with
[Getting Started](getting-started), then read
[Signals and Connections](signals) for exact dispatch behavior.

:::info Part of a stack
Echo is standalone. Weave uses the same lifecycle ideas for reactive UI, while
Flite uses Echo for local framework signals and state observation.
:::
