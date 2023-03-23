import { QueueItem } from '../models/QueueItem'
import { AutoProcessQueue } from './AutoProcessQueue'

test('pulls all items from queue one by one', (done) => {
	const items: QueueItem[] = [
		{ id: 'item1', url: 'url1' },
		{ id: 'item2', url: 'url2' },
		{ id: 'item3', url: 'url3' },
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
		const q = new AutoProcessQueue(f)
		await q.init()
    await q.queue.wipe()
		q.done = doneFn

		// add all items, without starting processing
		for (let item of items) await q.addItem(item, false)
		q.start()
	}
	asyncBlock()
},10000)
