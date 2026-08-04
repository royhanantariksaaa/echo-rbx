--!strict

--[=[
	@class Echo

	The root Echo module. Its only runtime export is `new`, which creates a
	typed asynchronous Signal. `Signal` and `Connection` are exported Luau
	types rather than runtime constructor tables.

	Echo provides notification fan-out, not retained state, replay, network
	transport, synchronous return aggregation, or automatic feature ownership.
]=]
local Echo = {}

--[=[
	@class Connection

	A stable public handle returned by `Signal:connect` or `Signal:once`.
	Echo never recycles this object into a later subscription. Disconnecting it
	clears references held by its linked-list node and cannot affect another
	connection created afterward.
]=]
local Connection = {}

--[=[
	@prop connected boolean
	@within Connection
	@readonly

	Whether this subscription is currently active. It becomes `false` after an
	individual disconnect, one-shot delivery, `Signal:disconnectAll`, or
	`Signal:destroy`.
]=]
Connection.connected = false

--- Disconnects this subscription in O(1). Repeated calls are safe.
function Connection:disconnect() end

--- PascalCase alias of `disconnect`.
function Connection:Disconnect() end

--[=[
	@class Signal

	An ordered linked collection of asynchronous listeners. Signals are created
	with `Echo.new<T...>()`; the same type pack is used by subscriptions,
	dispatch, and waiting.

	`fire` traverses from the oldest connection to the newest and resumes each
	connected callback through `task.spawn`. Traversal order is defined, but
	callback completion order and return values are not part of the contract.
]=]
local Signal = {}

--[=[
	Appends a persistent listener and returns its stable ownership handle.
	Retain the Connection whenever the subscriber may end before the Signal.

	@param callback (...any) -> () -- Listener invoked for each fire.
	@return Connection -- Stable subscription handle.
]=]
function Signal:connect(callback: (...any) -> ()): any
	return nil
end

--[=[
	Appends a listener that disconnects before its first invocation. The
	disconnect-before-callback order prevents nested fires from invoking the
	one-shot listener twice.

	@param callback (...any) -> () -- Listener invoked at most once.
	@return Connection -- Can also be disconnected early to cancel delivery.
]=]
function Signal:once(callback: (...any) -> ()): any
	return nil
end

--[=[
	Yields the calling coroutine until the next dispatch and returns all fired
	arguments. There is no built-in timeout. Clearing or destroying the Signal
	disconnects the hidden one-shot subscription without resuming the waiter.

	@yields
]=]
function Signal:wait(): ...any
	return
end

--[=[
	Traverses connected listeners and resumes callbacks through `task.spawn`.
	The method does not explicitly yield, await completion, collect callback
	returns, or clone table payloads. A callback may begin before `fire` returns.

	@param ... any -- Values forwarded unchanged to each scheduled callback.
]=]
function Signal:fire(...: any) end

--[=[
	Disconnects every active listener, updates each public handle, clears node
	references, and leaves the Signal reusable for a new listener generation.
]=]
function Signal:disconnectAll() end

--[=[
	Exact runtime alias of `disconnectAll`. Use it to communicate terminal owner
	intent, but note that Echo does not enforce a destroyed state or reject later
	connections and fires.
]=]
function Signal:destroy() end

--- PascalCase alias of `connect`.
function Signal:Connect(callback: (...any) -> ()): any return self:connect(callback) end

--- PascalCase alias of `once`.
function Signal:Once(callback: (...any) -> ()): any return self:once(callback) end

--- PascalCase alias of `wait`.
function Signal:Wait(): ...any return self:wait() end

--- PascalCase alias of `fire`.
function Signal:Fire(...: any) self:fire(...) end

--- PascalCase alias of `disconnectAll`.
function Signal:DisconnectAll() self:disconnectAll() end

--- PascalCase alias of `destroy`.
function Signal:Destroy() self:destroy() end

--[=[
	Creates an empty signal.

	Use `local signal: Echo.Signal<T...> = Echo.new()` to define the shared
	payload contract. The constructor accepts no options and performs no runtime
	payload schema validation.

	@return Signal -- Empty reusable signal.
]=]
function Echo.new(): any
	return nil
end

return Echo
