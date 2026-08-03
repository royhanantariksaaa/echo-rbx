--!native
--!optimize 2

local function noOp() end

local function createLinked(count: number)
	local head = nil
	local tail = nil
	local nodes = table.create(count)

	local function connect(node)
		node.previous = tail
		node.next = nil
		if tail then
			tail.next = node
		else
			head = node
		end
		tail = node
	end

	local function disconnect(node)
		local previous = node.previous
		local nextNode = node.next
		if previous then previous.next = nextNode else head = nextNode end
		if nextNode then nextNode.previous = previous else tail = previous end
		node.previous = nil
		node.next = nil
	end

	for index = 1, count do
		local node = { callback = noOp }
		nodes[index] = node
		connect(node)
	end

	return {
		fire = function()
			local node = head
			while node do
				node.callback()
				node = node.next
			end
		end,
		churn = function(index)
			local node = nodes[((index - 1) % count) + 1]
			disconnect(node)
			connect(node)
		end,
	}
end

local function createDense(count: number)
	local entries = table.create(count)
	local entryCount = count
	local deadCount = 0

	for index = 1, count do
		entries[index] = { callback = noOp, slot = index }
	end

	local function compact()
		local writeIndex = 1
		for readIndex = 1, entryCount do
			local entry = entries[readIndex]
			if entry then
				entries[writeIndex] = entry
				entry.slot = writeIndex
				writeIndex += 1
			end
		end
		for index = writeIndex, entryCount do
			entries[index] = nil
		end
		entryCount = writeIndex - 1
		deadCount = 0
	end

	return {
		fire = function()
			if deadCount > 0 then compact() end
			for index = 1, entryCount do
				entries[index].callback()
			end
		end,
		churn = function(index)
			if deadCount > 0 then compact() end
			local slot = ((index - 1) % entryCount) + 1
			local entry = entries[slot]
			entries[slot] = false
			deadCount += 1
			entryCount += 1
			entry.slot = entryCount
			entries[entryCount] = entry
		end,
	}
end

local function measure(factory, listenerCount: number, iterations: number, churn: boolean): number
	local storage = factory(listenerCount)
	local startedAt = os.clock()
	for iteration = 1, iterations do
		if churn then storage.churn(iteration) end
		storage.fire()
	end
	return (os.clock() - startedAt) * 1000
end

print("listeners,mode,linked_ms,dense_ms")
for _, listenerCount in { 8, 64, 512 } do
	local iterations = math.floor(2_000_000 / listenerCount)
	for _, mode in { "steady", "churn" } do
		local churn = mode == "churn"
		local linked = measure(createLinked, listenerCount, iterations, churn)
		local dense = measure(createDense, listenerCount, iterations, churn)
		print(`{listenerCount},{mode},{linked},{dense}`)
	end
end
