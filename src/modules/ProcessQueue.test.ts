import { ProcessQueue } from './ProcessQueue'
import fs from 'fs'
import { QueueItem } from '../models/QueueItem'

const dbPath = './database/queue-test.sqlite'
var q = new ProcessQueue(dbPath)

beforeAll(async () => {
	await q.init()
	await q.wipe()
})

afterEach(async () => {
	await q.wipe()
})

afterAll(async () => {
	await q.close()
	fs.unlinkSync(dbPath)
})

test('can add and retrieve item', async () => {
	let item = { id: 'qwerty', url: '123', date_queued: 0 }

	let res = await q.insertToDb(item)
	expect(res).toEqual(true)

	let item2 = await q.popFirst()
	expect(item2).toEqual(item)
})

test('returns null when getting item from empty queue', async () => {
	let item = await q.popFirst()
	expect(item).toEqual(null)
})

test('works in fifo order', async () => {
	let item1 = { id: 'qwerty', url: '123', date_queued: 0 }
	let item2 = { id: 'qwerty2', url: '1234', date_queued: 0 }

	await q.insertToDb(item1)
	await q.insertToDb(item2)

	let res1 = await q.popFirst()
	let res2 = await q.popFirst()

	expect(res1).toEqual(item1)
	expect(res2).toEqual(item2)
})

test('works with items adden in-between pulls', async () => {
	let item1 = { id: 'item1', url: '123', date_queued: 0 }
	let item2 = { id: 'item2', url: '123', date_queued: 0 }
	let item3 = { id: 'item3', url: '123', date_queued: 0 }
	let item4 = { id: 'item4', url: '123', date_queued: 0 }

	await q.insertToDb(item1)
	await q.insertToDb(item2)
	let res1 = await q.popFirst()
	await q.insertToDb(item3)
	await q.insertToDb(item4)
	let res2 = await q.popFirst()
	let res3 = await q.popFirst()
	let res4 = await q.popFirst()

	expect(res1).toEqual(item1)
	expect(res2).toEqual(item2)
	expect(res3).toEqual(item3)
	expect(res4).toEqual(item4)
})

test('automatically pulls all items from queue one by one', (done) => {
	const items: QueueItem[] = [
		{ id: 'item1', url: 'url1', date_queued: 0 },
		{ id: 'item2', url: 'url2', date_queued: 0 },
		{ id: 'item3', url: 'url3', date_queued: 0 },
	]
	const results: QueueItem[] = []

	// function called for each item
	const mockFn = jest.fn()

	const f = (item: QueueItem) => {
		return new Promise<void>((resolve) => {
			setTimeout(() => {
				mockFn()
				results.push(item)
				resolve()
			}, 100)
		})
	}

	// function called when all items are processed - finishes test
	const doneFn = () => {
		expect(items).toEqual(results)
		expect(mockFn).toHaveBeenCalledTimes(3)
		done()
	}

	// init queue and add items
	const asyncBlock = async () => {
		q.done = doneFn
		q.forEach = f

		// add all items, without starting processing
		for (let item of items) await q.enqueue(item, false)
		q.processItems()
	}
	asyncBlock()
}, 10000)
