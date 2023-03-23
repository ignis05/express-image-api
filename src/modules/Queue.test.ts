import { Queue } from './Queue'
import fs from 'fs'

const dbPath = './database/queue-test.sqlite'
var q = new Queue(dbPath)

beforeAll(async () => {
	await q.init()
	await q.wipe()
})

afterEach(async () => {
	await q.wipe()
})

afterAll((done) => {
	q.db.close(() => {
		fs.unlinkSync(dbPath)
		done()
	})
})

test('can add and retrieve item', async () => {
	let item = { id: 'qwerty', url: '123', date_queued: 0 }

	let res = await q.addItem(item)
	expect(res).toEqual(true)

	let item2 = await q.getItem()
	expect(item2).toEqual(item)
})

test('returns null when getting item from empty queue', async () => {
	let item = await q.getItem()
	expect(item).toEqual(null)
})

test('works in fifo order', async () => {
	let item1 = { id: 'qwerty', url: '123', date_queued: 0 }
	let item2 = { id: 'qwerty2', url: '1234', date_queued: 0 }

	await q.addItem(item1)
	await q.addItem(item2)

	let res1 = await q.getItem()
	let res2 = await q.getItem()

	expect(res1).toEqual(item1)
	expect(res2).toEqual(item2)
})

test('works with items adden in-between pulls', async () => {
	let item1 = { id: 'item1', url: '123', date_queued: 0 }
	let item2 = { id: 'item2', url: '123', date_queued: 0 }
	let item3 = { id: 'item3', url: '123', date_queued: 0 }
	let item4 = { id: 'item4', url: '123', date_queued: 0 }

	await q.addItem(item1)
	await q.addItem(item2)
	let res1 = await q.getItem()
	await q.addItem(item3)
	await q.addItem(item4)
	let res2 = await q.getItem()
	let res3 = await q.getItem()
	let res4 = await q.getItem()

	expect(res1).toEqual(item1)
	expect(res2).toEqual(item2)
	expect(res3).toEqual(item3)
	expect(res4).toEqual(item4)
})
