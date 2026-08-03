--!strict

--[=[
	@class Echo

	Creates typed asynchronous signals with stable connection handles.
]=]
local Echo = {}

--[=[
	@class Connection

	A stable handle returned by `Signal:connect` or `Signal:once`.
]=]
local Connection = {}

--[=[
	@prop connected boolean
	@within Connection
	@readonly

	Whether this subscription is currently active.
]=]
Connection.connected = false

--- Disconnects the subscription. Repeated calls are safe.
function Connection:disconnect() end

--- PascalCase alias of `disconnect`.
function Connection:Disconnect() end

--[=[
	@class Signal

	An ordered collection of asynchronous listeners.
]=]
local Signal = {}

--[=[
	Adds a persistent listener.
	@param callback (...any) -> () -- Listener invoked for each fire.
	@return Connection -- Stable subscription handle.
]=]
function Signal:connect(callback: (...any) -> ()): any
	return nil
end

--[=[
	Adds a listener that disconnects before its first invocation.
	@param callback (...any) -> () -- Listener invoked at most once.
	@return Connection
]=]
function Signal:once(callback: (...any) -> ()): any
	return nil
end

--[=[
	Yields until the next dispatch and returns all fired arguments.
	@yields
]=]
function Signal:wait(): ...any
	return
end

--- Schedules all currently connected listeners without yielding the caller.
function Signal:fire(...: any) end

--- Disconnects every active listener while keeping the signal reusable.
function Signal:disconnectAll() end

--- Lifecycle alias of `disconnectAll`.
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
	@return Signal
]=]
function Echo.new(): any
	return nil
end

return Echo
