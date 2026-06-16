# Echo

A lean, extremely fast, pure-Luau signal implementation.

Utilizes a doubly-linked list for O(1) connection/disconnection and thread
pooling for zero-yield instant execution. Based on fast-signal patterns.

Echo is a leaf primitive with **no dependencies** — it's consumed by
[Weave](https://github.com/royhanantariksaaa/weave-rbx) and
[Flite](https://github.com/royhanantariksaaa/flite-rbx) (and any other library
that needs a fast signal).

```lua
local Echo = require(ReplicatedStorage.Libraries.Echo)

local signal = Echo.new()
local connection = signal:connect(function(...)
	print("fired:", ...)
end)
signal:fire("hello")  --> fired: hello
connection:disconnect()
```

## Consume as a git submodule

From your game repo root (assuming `src/Shared` maps to `ReplicatedStorage`):

```sh
git submodule add https://github.com/royhanantariksaaa/echo-rbx.git src/Shared/Libraries/Echo
```

This lands Echo at `ReplicatedStorage.Libraries.Echo`.

## Standalone dev

Open the project in [Rojo](https://rojo.space):

```sh
rojo serve default.project.json
```

This serves Echo at `ReplicatedStorage.Libraries.Echo`.

## License

[MIT](./LICENSE).
