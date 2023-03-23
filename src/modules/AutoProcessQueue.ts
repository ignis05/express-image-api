import { QueueItem } from '../models/QueueItem'
import { Queue } from './Queue'

type forEachFunc = (item: QueueItem) => Promise<void>

class AutoProcessQueue {
	queue: Queue
	forEach: forEachFunc
	isRunning = false
	done: (() => void) | undefined // function called when all items are processed

	constructor(dbPath: string, forEach: forEachFunc) {
		this.forEach = forEach
		this.queue = new Queue(dbPath)
	}

	init() {
		return this.queue.init()
	}

	// starts autoqueue, makes sure it won't be duplicated if already running
	start() {
		if (!this.isRunning) {
			this.isRunning = true
			this.run()
		}
	}

	// pulls items out of queue until its empty
	async run() {
		// fetch all items
		var item = await this.queue.popItem()
		while (item) {
			await this.forEach(item)
			item = await this.queue.popItem()
		}

		// no more items in queue
		this.done?.()
		this.isRunning = false
	}

	// adds item to the queue. starts processing unless disabled with argument
	addItem(item: QueueItem, startProcessing = true) {
		return new Promise<void>(async (resolve) => {
			await this.queue.addItem(item)
			if (startProcessing) this.start()
			resolve()
		})
	}

	getById(id: string) {
		return this.queue.getByID(id)
	}
}

export { AutoProcessQueue }
