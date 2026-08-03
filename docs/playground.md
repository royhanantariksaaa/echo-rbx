---
sidebar_position: 1.5
title: Interactive Playground
description: Run Echo signal lifecycle scenarios and watch connections, one-shot listeners, dispatch, and teardown.
---

# Echo Playground

Edit a small, real-shaped Echo scenario and watch every connection change as
the signal fires. The browser model focuses on lifecycle semantics, so it is
fast enough to experiment with before opening Studio.

<div className="playground-actions">
  <a className="button button--primary" href="/echo-rbx/playground/" target="_blank" rel="noreferrer">Open full screen</a>
  <a className="button button--secondary" href="/echo-rbx/docs/tutorial-score-feed/">Build it in Studio</a>
</div>

<div className="playground-frame">
  <iframe src="/echo-rbx/playground/" title="Echo signal lifecycle playground" loading="eager"></iframe>
</div>

## A useful five-minute path

1. Run **Listener lifecycle** and compare active listeners with total
   deliveries after each fire.
2. Switch to **One-shot listener**. Notice that the Once subscriber removes
   itself after its first delivery.
3. Move the analytics disconnect above the second Fire call and run again.
4. Add another named Connect call, then verify that DisconnectAll leaves zero
   active listeners.
5. Finish with Destroy and confirm that no later operation is accepted.

## What this model teaches

The editor recognizes the public lifecycle calls <code>Echo.new</code>,
<code>Connect</code>, <code>Once</code>, <code>Fire</code>,
<code>Disconnect</code>, <code>DisconnectAll</code>, and
<code>Destroy</code>. Listener labels stand in for callbacks so the dispatch
trace can show exactly which subscriber received each value.

:::note Browser model versus Roblox runtime
The playground models documented connection and teardown behavior. Roblox task
scheduling and real callback execution are shown in the recorded
[Score Feed tutorial](./tutorial-score-feed).
:::

Continue with [Getting Started](./getting-started) for installation, then use
[Signals and Connections](./signals) and the
[generated Echo reference](../api/Echo) when you need exact behavior and
signatures.
