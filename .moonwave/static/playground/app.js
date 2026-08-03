"use strict";

const examples = {
  lifecycle: [
    "local score = Echo.new()",
    "local hud = score:Connect(\"HUD\")",
    "local analytics = score:Connect(\"Analytics\")",
    "score:Once(\"Milestone\")",
    "score:Fire(5)",
    "score:Fire(10)",
    "analytics:Disconnect()",
    "score:Fire(20)",
    "score:Destroy()",
  ].join("\n"),
  once: [
    "local ready = Echo.new()",
    "ready:Once(\"Bootstrap\")",
    "ready:Connect(\"Observer\")",
    "ready:Fire(1)",
    "ready:Fire(2)",
    "ready:DisconnectAll()",
  ].join("\n"),
  teardown: [
    "local changed = Echo.new()",
    "local ui = changed:Connect(\"UI\")",
    "local audio = changed:Connect(\"Audio\")",
    "local metrics = changed:Connect(\"Metrics\")",
    "changed:Fire(8)",
    "changed:DisconnectAll()",
    "changed:Fire(13)",
    "changed:Destroy()",
  ].join("\n"),
};

const editor = document.getElementById("scriptEditor");
const picker = document.getElementById("examplePicker");
const runButton = document.getElementById("runButton");
const resetButton = document.getElementById("resetButton");
const errorOutput = document.getElementById("editorError");
const runtimeState = document.getElementById("runtimeState");
const fireCount = document.getElementById("fireCount");
const deliveryCount = document.getElementById("deliveryCount");
const activeCount = document.getElementById("activeCount");
const listenerList = document.getElementById("listenerList");
const timeline = document.getElementById("timeline");
const connectionSummary = document.getElementById("connectionSummary");
const signalBus = document.getElementById("signalBus");

let runVersion = 0;
let model = createModel();

function createModel() {
  return {
    signalName: null,
    destroyed: false,
    fires: 0,
    deliveries: 0,
    listeners: [],
    handles: new Map(),
  };
}

function wait(milliseconds) {
  return new Promise(function(resolve) {
    window.setTimeout(resolve, milliseconds);
  });
}

function parseScenario(source) {
  const operations = [];
  const lines = source.split(/\r?\n/);

  lines.forEach(function(rawLine, index) {
    const line = rawLine.trim();
    const lineNumber = index + 1;
    let match;

    if (!line || line.startsWith("--")) {
      return;
    }

    match = line.match(/^local\s+([A-Za-z_]\w*)\s*=\s*Echo\.new\(\)$/);
    if (match) {
      operations.push({ type: "new", signal: match[1], line: lineNumber });
      return;
    }

    match = line.match(/^local\s+([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*):Connect\("([^"]+)"\)$/);
    if (match) {
      operations.push({
        type: "connect",
        handle: match[1],
        signal: match[2],
        name: match[3],
        once: false,
        line: lineNumber,
      });
      return;
    }

    match = line.match(/^([A-Za-z_]\w*):Connect\("([^"]+)"\)$/);
    if (match) {
      operations.push({
        type: "connect",
        handle: null,
        signal: match[1],
        name: match[2],
        once: false,
        line: lineNumber,
      });
      return;
    }

    match = line.match(/^([A-Za-z_]\w*):Once\("([^"]+)"\)$/);
    if (match) {
      operations.push({
        type: "connect",
        handle: null,
        signal: match[1],
        name: match[2],
        once: true,
        line: lineNumber,
      });
      return;
    }

    match = line.match(/^([A-Za-z_]\w*):Fire\((-?\d+(?:\.\d+)?)\)$/);
    if (match) {
      operations.push({
        type: "fire",
        signal: match[1],
        value: Number(match[2]),
        line: lineNumber,
      });
      return;
    }

    match = line.match(/^([A-Za-z_]\w*):Disconnect\(\)$/);
    if (match) {
      operations.push({ type: "disconnect", handle: match[1], line: lineNumber });
      return;
    }

    match = line.match(/^([A-Za-z_]\w*):DisconnectAll\(\)$/);
    if (match) {
      operations.push({ type: "disconnectAll", signal: match[1], line: lineNumber });
      return;
    }

    match = line.match(/^([A-Za-z_]\w*):Destroy\(\)$/);
    if (match) {
      operations.push({ type: "destroy", signal: match[1], line: lineNumber });
      return;
    }

    throw new Error("Line " + lineNumber + ": unsupported statement");
  });

  if (operations.length === 0) {
    throw new Error("Add at least one supported statement.");
  }

  return operations;
}

function assertSignal(operation) {
  if (!model.signalName) {
    throw new Error("Line " + operation.line + ": create a signal first");
  }
  if (operation.signal && operation.signal !== model.signalName) {
    throw new Error("Line " + operation.line + ": unknown signal " + operation.signal);
  }
  if (model.destroyed && operation.type !== "new") {
    throw new Error("Line " + operation.line + ": the signal is destroyed");
  }
}

function addTrace(label, detail, kind) {
  const item = document.createElement("li");
  const strong = document.createElement("strong");
  strong.textContent = label + " ";
  item.appendChild(strong);
  item.appendChild(document.createTextNode(detail));
  if (kind) {
    item.classList.add(kind);
  }
  timeline.appendChild(item);
  while (timeline.children.length > 12) {
    timeline.removeChild(timeline.firstChild);
  }
}

function render() {
  fireCount.textContent = String(model.fires);
  deliveryCount.textContent = String(model.deliveries);

  const active = model.listeners.filter(function(listener) {
    return listener.active;
  }).length;
  activeCount.textContent = String(active);
  connectionSummary.textContent = model.listeners.length === 0
    ? "No listeners"
    : active + " active / " + model.listeners.length + " total";

  listenerList.replaceChildren();
  if (model.listeners.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Connections appear here as the scenario runs.";
    listenerList.appendChild(empty);
    return;
  }

  model.listeners.forEach(function(listener) {
    const row = document.createElement("div");
    row.className = "listener-row";
    row.dataset.listenerId = String(listener.id);
    if (listener.once) {
      row.classList.add("once");
    }
    if (!listener.active) {
      row.classList.add("disconnected");
    }

    const text = document.createElement("div");
    const name = document.createElement("div");
    name.className = "listener-name";
    name.textContent = listener.name;
    const meta = document.createElement("div");
    meta.className = "listener-meta";
    meta.textContent = listener.active
      ? (listener.once ? "Once connection" : "Persistent connection")
      : "Disconnected";
    text.append(name, meta);

    const count = document.createElement("span");
    count.className = "listener-count";
    count.textContent = listener.events + " received";
    row.append(text, count);
    listenerList.appendChild(row);
  });
}

function setRuntime(label, state) {
  runtimeState.textContent = label;
  runtimeState.dataset.state = state || "";
}

function pulseBus() {
  signalBus.classList.remove("is-firing");
  void signalBus.offsetWidth;
  signalBus.classList.add("is-firing");
}

async function flashListener(listener) {
  const row = listenerList.querySelector('[data-listener-id="' + listener.id + '"]');
  if (!row) {
    return;
  }
  row.classList.add("flash");
  await wait(180);
  row.classList.remove("flash");
}

async function execute(operation, version) {
  if (version !== runVersion) {
    return;
  }

  if (operation.type === "new") {
    if (model.signalName && !model.destroyed) {
      throw new Error("Line " + operation.line + ": this playground models one signal at a time");
    }
    model.signalName = operation.signal;
    model.destroyed = false;
    addTrace("Echo.new()", "allocated " + operation.signal, "");
  } else if (operation.type === "connect") {
    assertSignal(operation);
    const listener = {
      id: model.listeners.length + 1,
      name: operation.name,
      once: operation.once,
      active: true,
      events: 0,
    };
    model.listeners.push(listener);
    if (operation.handle) {
      model.handles.set(operation.handle, listener);
    }
    addTrace(
      operation.once ? "Once" : "Connect",
      operation.name + " subscribed",
      ""
    );
  } else if (operation.type === "fire") {
    assertSignal(operation);
    model.fires += 1;
    pulseBus();
    addTrace("Fire(" + operation.value + ")", "dispatch started", "fire");
    const targets = model.listeners.filter(function(listener) {
      return listener.active;
    });
    for (const listener of targets) {
      listener.events += 1;
      model.deliveries += 1;
      if (listener.once) {
        listener.active = false;
      }
      render();
      await flashListener(listener);
      addTrace("Delivered", operation.value + " to " + listener.name, "fire");
    }
  } else if (operation.type === "disconnect") {
    const listener = model.handles.get(operation.handle);
    if (!listener) {
      throw new Error("Line " + operation.line + ": unknown connection handle " + operation.handle);
    }
    listener.active = false;
    addTrace("Disconnect", listener.name + " removed in O(1)", "cleanup");
  } else if (operation.type === "disconnectAll") {
    assertSignal(operation);
    model.listeners.forEach(function(listener) {
      listener.active = false;
    });
    addTrace("DisconnectAll", "all listeners removed", "cleanup");
  } else if (operation.type === "destroy") {
    assertSignal(operation);
    model.listeners.forEach(function(listener) {
      listener.active = false;
    });
    model.destroyed = true;
    addTrace("Destroy", "signal permanently released", "cleanup");
    setRuntime("Destroyed", "destroyed");
  }

  render();
  await wait(360);
}

async function runScenario() {
  const version = ++runVersion;
  let operations;

  errorOutput.textContent = "";
  try {
    operations = parseScenario(editor.value);
  } catch (error) {
    errorOutput.textContent = error.message;
    return;
  }

  model = createModel();
  timeline.replaceChildren();
  render();
  runButton.disabled = true;
  editor.disabled = true;
  picker.disabled = true;
  setRuntime("Running", "running");

  try {
    for (const operation of operations) {
      await execute(operation, version);
    }
    if (version === runVersion && !model.destroyed) {
      setRuntime("Complete", "complete");
    }
  } catch (error) {
    if (version === runVersion) {
      errorOutput.textContent = error.message;
      setRuntime("Stopped", "destroyed");
    }
  } finally {
    if (version === runVersion) {
      runButton.disabled = false;
      editor.disabled = false;
      picker.disabled = false;
    }
  }
}

function loadExample(name) {
  runVersion += 1;
  editor.value = examples[name];
  errorOutput.textContent = "";
  model = createModel();
  timeline.replaceChildren();
  render();
  setRuntime("Ready", "");
  runButton.disabled = false;
  editor.disabled = false;
  picker.disabled = false;
}

picker.addEventListener("change", function() {
  loadExample(picker.value);
});

runButton.addEventListener("click", runScenario);
resetButton.addEventListener("click", function() {
  loadExample(picker.value);
});

loadExample("lifecycle");
