---
sidebar_position: 1
slug: /intro
---

# Echo

<div className="lesson-header">
  <p className="lesson-kicker"><span className="streamline-icon streamline-icon--identity" aria-hidden="true"></span> Introduction / Chapter 1</p>
  <p className="lesson-summary">Echo is a small typed Luau signal library for Roblox. It provides asynchronous dispatch, stable connection handles, idempotent teardown, and lowercase APIs with complete PascalCase compatibility aliases.</p>
  <div className="lesson-progress" aria-label="Learn Echo progress: 20 percent"><span className="lesson-progress__fill lesson-progress__fill--20"></span></div>
</div>

<div className="lesson-goals">
  <strong>By the end of this chapter</strong>
  <ul>
    <li>Know where Echo fits in a Roblox game.</li>
    <li>Choose between the focused lesson, practice lab, and complete game track.</li>
    <li>Understand the guarantees that distinguish Echo from a raw callback list.</li>
  </ul>
</div>

<figure className="tutorial-demo intro-demo">
  <img className="tutorial-demo__motion" src="/echo-rbx/tutorials/echo-signal-flow.gif" alt="Echo signal subscribers receiving score events in Roblox Studio" />
  <img className="tutorial-demo__still" src="/echo-rbx/tutorials/echo-signal-flow.png" alt="Echo score signal tutorial result" />
  <figcaption>Independent subscribers, one-shot delivery, and explicit teardown in a real Studio run.</figcaption>
</figure>

## Choose your path

<div className="learning-path learning-path--four">
  <a className="learning-path__item" href="/echo-rbx/docs/playground/"><span>01 / Experiment</span><strong>Run the signal lab</strong><small>Edit fires and listeners with instant lifecycle feedback.</small></a>
  <a className="learning-path__item" href="/echo-rbx/docs/tutorial-score-feed/"><span>02 / Focus</span><strong>Make a score feed</strong><small>Learn the complete signal lifecycle in one contained Studio feature.</small></a>
  <a className="learning-path__item" href="/echo-rbx/docs/project-crystal-run/"><span>03 / Complete game</span><strong>Wire Crystal Run events</strong><small>Connect server facts to HUD, feedback, analytics, and milestones.</small></a>
  <a className="learning-path__item" href="/echo-rbx/docs/api-overview/"><span>04 / Reference</span><strong>Check the API</strong><small>Confirm signatures, aliases, dispatch rules, and cleanup.</small></a>
</div>

## Why Echo

- **Small surface:** one constructor, one signal type, and one connection type.
- **Safe handles:** disconnected connections are never recycled into unrelated
  subscriptions.
- **Predictable dispatch:** each listener runs independently through Roblox's
  task scheduler.
- **Churn-friendly storage:** connect and disconnect are constant-time.

New to Echo? Continue with [Getting Started](getting-started), use the
[interactive playground](playground) to test semantics, then build Echo's
[Crystal Run event layer](project-crystal-run) in the complete game track.

:::info Part of a stack
Echo is standalone. Weave uses the same lifecycle ideas for reactive UI, while
Flite uses Echo for local framework signals and state observation.
:::
