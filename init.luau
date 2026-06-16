--!optimize 2
--!strict

--[[
	Echo
	A lean, extremely fast, pure-Luau signal implementation.
	Utilizes a doubly-linked list for O(1) connection/disconnection
	and thread pooling for zero-yield instant execution.

	Based on fast-signal patterns.
]]

export type Connection<T... = ...any> = {
	disconnect: (self: Connection<T...>) -> (),
	connected: boolean,
}

export type Signal<T... = ...any> = {
	connect: (self: Signal<T...>, fn: (T...) -> ()) -> Connection<T...>,
	once: (self: Signal<T...>, fn: (T...) -> ()) -> Connection<T...>,
	wait: (self: Signal<T...>) -> T...,
	fire: (self: Signal<T...>, T...) -> (),
	disconnectAll: (self: Signal<T...>) -> (),
	destroy: (self: Signal<T...>) -> (),
}

local freeRunnerThread: thread? = nil
local freeConnection: any = nil

local function acquireRunnerThreadAndCallEventHandler(fn: (...any) -> (), ...)
	local acquiredRunnerThread = freeRunnerThread
	freeRunnerThread = nil
	fn(...)
	-- The handler finished running, this runner thread is free again.
	freeRunnerThread = acquiredRunnerThread
end

local function runEventHandlerInFreeThread(...)
	acquireRunnerThreadAndCallEventHandler(...)
	while true do
		acquireRunnerThreadAndCallEventHandler(coroutine.yield())
	end
end

local Connection = {}
Connection.__index = Connection

--[[ Disconnect the connection from the signal. ]]
function Connection:disconnect()
	if not self.connected then return end
	self.connected = false

	local signal = self._signal :: any
	if not signal then return end

	local selfAny = self :: any

	-- Remove from linked list
	if signal._head == self then
		signal._head = selfAny._next
	else
		if selfAny._prev then selfAny._prev._next = selfAny._next end
	end
	
	if signal._tail == self then
		signal._tail = selfAny._prev
	else
		if selfAny._next then selfAny._next._prev = selfAny._prev end
	end

	-- Clear payload data
	self._signal = nil
	self._fn = nil
	self._prev = nil
	
	-- Connection pooling
	self._next = freeConnection
	freeConnection = self
end

local Signal = {}
Signal.__index = Signal

--[[ Constructs a new Echo. ]]
function Signal.new<T...>(): Signal<T...>
	return setmetatable({
		_head = nil,
		_tail = nil,
	}, Signal) :: any
end

--[[ Connects a handler function to this signal. ]]
function Signal:connect(fn: (...any) -> ())
	local connection
	if freeConnection then
		connection = freeConnection
		freeConnection = connection._next
		
		connection.connected = true
		connection._signal = self
		connection._fn = fn
		connection._prev = nil
		connection._next = nil
		setmetatable(connection, Connection)
	else
		connection = setmetatable({
			connected = true,
			_signal = self,
			_fn = fn,
			_prev = nil,
			_next = nil,
		}, Connection)
	end

	-- Append to tail
	if self._tail then
		self._tail._next = connection
		connection._prev = self._tail
		self._tail = connection
	else
		self._head = connection
		self._tail = connection
	end

	return connection
end

--[[ Connects a handler function that auto-disconnects after the first fire. ]]
function Signal:once(fn: (...any) -> ())
	local connection
	local done = false
	connection = self:connect(function(...)
		if done then return end
		done = true
		connection:disconnect()
		fn(...)
	end)
	return connection
end

--[[ Yields the current thread until the signal is fired. ]]
function Signal:wait()
	local thread = coroutine.running()
	self:once(function(...)
		task.spawn(thread, ...)
	end)
	return coroutine.yield()
end

--[[ Dispatches the signal to all connected handlers. ]]
function Signal:fire(...)
	local item = self._head
	while item do
		local nextItem = item._next
		if item.connected then
			if not freeRunnerThread then
				freeRunnerThread = coroutine.create(runEventHandlerInFreeThread)
			end
			task.spawn(freeRunnerThread :: thread, item._fn, ...)
		end
		item = nextItem
	end
end

--[[ Disconnects all current connections. ]]
function Signal:disconnectAll()
	local item = self._head
	while item do
		item.connected = false
		local nextItem = item._next
		
		local itemAny = item :: any
		itemAny._signal = nil
		itemAny._fn = nil
		itemAny._prev = nil
		
		itemAny._next = freeConnection :: any
		freeConnection = item :: any
		
		item = nextItem
	end
	local selfAny = self :: any
	selfAny._head = nil
	selfAny._tail = nil
end

--[[ Destroys the signal. ]]
function Signal:destroy()
	self:disconnectAll()
end

Connection.Disconnect = Connection.disconnect
Signal.Connect = Signal.connect
Signal.Once = Signal.once
Signal.Wait = Signal.wait
Signal.Fire = Signal.fire
Signal.DisconnectAll = Signal.disconnectAll
Signal.Destroy = Signal.destroy

return {
	new = Signal.new
}
