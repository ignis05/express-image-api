import { QueueItem } from '../models/QueueItem'
import { AutoProcessQueue } from './AutoProcessQueue'
import fs from 'fs'

const dbPath = './database/queue-test2.sqlite'
const q = new AutoProcessQueue(dbPath, () => {
	return new Promise<void>((res) => res())
})

beforeAll(async () => {
	await q.init()
	await q.queue.wipe()
})

afterEach(async () => {
	await q.queue.wipe()
})

afterAll((done) => {
	q.queue.db.close(() => {
		fs.unlinkSync(dbPath)
		done()
	})
})

test('pulls all items from queue one by one', (done) => {
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
		for (let item of items) await q.addItem(item, false)
		q.start()
	}
	asyncBlock()
}, 10000)
