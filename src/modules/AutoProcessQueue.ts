import { QueueItem } from '../models/QueueItem'
import { Queue } from './Queue'

type forEachFunc = (item: QueueItem) => Promise<void>

class AutoProcessQueue {
	queue = new Queue('./database/queue.sqlite')
	forEach: forEachFunc
	isRunning = false
	done: (() => void) | undefined // function called when all items are processed

	constructor(forEach: forEachFunc) {
		this.forEach = forEach
	}

	init() {
		return this.queue.init()
	}

	// triggers a func for each item pulled out of queue until the queue is empty
	async start() {
		this.isRunning = true

		let item = await this.queue.getItem()

		// no more items in queue
		if (!item) {
			this.isRunning = false
			return this.done?.()
		}

		await this.forEach(item)
		this.start()
	}

	// adds item to the queue. starts processing unless disabled with argument
	addItem(item: QueueItem, startProcessing = true) {
		return new Promise<void>(async (resolve) => {
			await this.queue.addItem(item)
			if (!this.isRunning && startProcessing) this.start()
			resolve()
		})
	}
}

export { AutoProcessQueue }
