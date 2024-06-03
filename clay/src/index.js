import { DurableObject } from "cloudflare:workers"

// Worker
export default {
	async fetch(request, env) {
		let url = new URL(request.url)
		let path = url.pathname

		if (!path.startsWith('/data/')) return new Response('Not Found', {status: 404})
		
		// Get the :id segment
		let pathId = path.split("/")[2] // 0 index is an empty string before the first '/', 1 is 'data', 2 is ':pathId'

		if(pathId === undefined || !pathId.match(/^[a-z0-9-]+$/i)) {
			return new Response('Invalid ID', {status: 400})
		}

		// Every unique ID refers to an individual instance of the Counter class that
		// has its own state. `idFromName()` always returns the same ID when given the
		// same string as input (and called on the same class), but never the same
		// ID for two different strings (or for different classes).
		let id = env.COUNTERS.idFromName(pathId)

		// Construct the stub for the Durable Object using the ID.
		// A stub is a client Object used to send messages to the Durable Object.
		let stub = env.COUNTERS.get(id)

		// Send a request to the Durable Object using RPC methods, then await its response.
		let count = null
		switch (request.method) {
			case "POST":
				count = await stub.increment()
				break
			case "GET":
				count = await stub.getCounterValue()
				break
			default:
				return new Response("Not found", { status: 404 })
		}

		return new Response(`Durable Object ${pathId} / ${id}, count: ${count}`)
	}
}

export class Counter extends DurableObject {

	async getCounterValue() {
		let value = (await this.ctx.storage.get("value")) || 0
		return value
	}

	async increment(amount = 1) {
		let value = (await this.ctx.storage.get("value")) || 0
		value += amount
		// You do not have to worry about a concurrent request having modified the value in storage.
		// "input gates" will automatically protect against unwanted concurrency.
		// Read-modify-write is safe.
		await this.ctx.storage.put("value", value)
		return value
	}

	async decrement(amount = 1) {
		let value = (await this.ctx.storage.get("value")) || 0
		value -= amount
		await this.ctx.storage.put("value", value)
		return value
	}
}