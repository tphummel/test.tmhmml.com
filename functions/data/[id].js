import { DurableObject } from "cloudflare:workers"

export async function onRequest({request, env, params}) {
	let url = new URL(request.url)
	let path = url.pathname
	let {id} = params

	if(id === undefined || !id.match(/^[a-z0-9-]+$/i)) {
		return new Response('Invalid ID', {status: 400})
	}

	// Every unique ID refers to an individual instance of the Counter class that
	// has its own state. `idFromName()` always returns the same ID when given the
	// same string as input (and called on the same class), but never the same
	// ID for two different strings (or for different classes).
	let doId = env.COUNTERS.idFromName(id)

	// Construct the stub for the Durable Object using the ID.
	// A stub is a client Object used to send messages to the Durable Object.
	let stub = env.COUNTERS.get(doId)

	// Send a request to the Durable Object using RPC methods, then await its response.
	let count = null
	switch (request.method) {
		case "POST":
			count = (await stub.get("value")) || 0
			break
		case "GET":
			count = (await stub.get("value")) || 0
			count += 1
			// You do not have to worry about a concurrent request having modified the value in storage.
			// "input gates" will automatically protect against unwanted concurrency.
			// Read-modify-write is safe.
			await stub.put("value", count)
			break
		default:
			return new Response("Not found", { status: 404 })
	}

	return new Response(`Durable Object ${id} / ${doId}, count: ${count}`)
}
