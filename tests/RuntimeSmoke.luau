--[=[
	@module RuntimeSmoke
	@within Echo.tests

	Standalone Roblox Studio smoke coverage for signal dispatch and connection
	lifecycle behavior.
]=]

local Echo = require(game:GetService("ReplicatedStorage").Libraries.Echo)

local checks = 0
local function check(condition: boolean, message: string)
	assert(condition, message)
	checks += 1
end

local signal = Echo.new()
local total = 0
local connection = signal:connect(function(value)
	total += value
end)

signal:fire(2)
check(total == 2, "connected handlers should receive fired arguments")
check(connection.connected, "new connection should report connected")
connection:disconnect()
connection:disconnect()
signal:fire(2)
check(total == 2 and not connection.connected, "disconnect should be idempotent")

local replacement = signal:connect(function(value)
	total += value * 10
end)
check(replacement ~= connection, "a disconnected public handle must never be recycled")
check(not connection.connected, "old handles must stay disconnected")
connection:disconnect()
signal:fire(3)
check(total == 32, "an old handle must not disconnect a replacement listener")

local onceCount = 0
signal:once(function()
	onceCount += 1
end)
signal:fire(1)
signal:fire(1)
check(onceCount == 1, "once should invoke its handler exactly once")

local aliasCount = 0
local aliasConnection = signal:Connect(function()
	aliasCount += 1
end)
signal:Fire(0)
check(aliasCount == 1, "PascalCase compatibility aliases should dispatch")
aliasConnection:Disconnect()
check(not aliasConnection.connected, "PascalCase Disconnect should update the public handle")
check(type(signal.Once) == "function" and type(signal.Wait) == "function"
	and type(signal.DisconnectAll) == "function" and type(signal.Destroy) == "function",
	"all PascalCase compatibility aliases should be exposed")

signal:disconnectAll()
check(not replacement.connected, "disconnectAll should update connection handles")
signal:fire(10)
check(total == 52, "disconnectAll should remove every active handler")

local reusableCount = 0
signal:connect(function()
	reusableCount += 1
end)
signal:fire()
check(reusableCount == 1, "a cleared signal should remain reusable")
signal:destroy()

print(`[Echo RuntimeSmoke] PASS ({checks} checks)`)
