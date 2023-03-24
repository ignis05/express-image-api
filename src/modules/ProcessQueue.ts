import sqlite3 from 'sqlite3'
import fs from 'fs'
import { QueueItem } from '../models/QueueItem'

type forEachFunc = (item: QueueItem) => Promise<void>

class ProcessQueue {
	dbPath: string
	db: sqlite3.Database
	isReady: boolean
	isRunning = false // true if loop is pulling all items, prevents parallel runs
	forEach: forEachFunc | undefined // function called for each pulled item
	done: (() => void) | undefined // function called when all items are processed

	constructor(dbPath: string) {
		this.dbPath = dbPath

		// check if db file exists, create it if not
		this.isReady = fs.existsSync(dbPath)
		if (!this.isReady) fs.openSync(dbPath, 'w')

		this.db = new sqlite3.Database(dbPath)
	}

	// initialises tables if db was freshly created
	init() {
		return new Promise<void>(async (resolve, reject) => {
			if (this.isReady) return resolve()

			this.db.all(
				`CREATE TABLE queue (
						id VARCHAR(50) NOT NULL PRIMARY KEY,
						url VARCHAR(255) NOT NULL,
						date_queued INTEGER NOT NULL
						)`,
				(err, rows) => {
					if (err) return reject(err)
					this.isReady = true
					resolve()
				}
			)
		})
	}

	// deletes everything from queue
	wipe() {
		return new Promise<void>(async (resolve, reject) => {
			this.db.all(`DELETE FROM queue`, (err, rows) => {
				if (err) return reject(err)
				resolve()
			})
		})
	}

	// inserts item to db
	insertToDb(item: QueueItem) {
		return new Promise<boolean>((resolve, reject) => {
			this.db.all(`INSERT INTO queue VALUES (?,?,?)`, [item.id, item.url, item.date_queued], (err, rows) => {
				if (err) return reject(err)
				resolve(true)
			})
		})
	}

	// removes item from db
	deleteFromDb(id: string) {
		return new Promise<void>((resolve, reject) => {
			this.db.all('DELETE FROM queue WHERE id=(?)', id, (err, rows) => {
				if (err) return reject(err)
				resolve()
			})
		})
	}

	// returns first item from queue, removing it from the queue. Returns null if queue is empty
	popFirst() {
		return new Promise<QueueItem | null>(async (resolve, reject) => {
			let item = await this.getFirst()

			if (!item) return resolve(null)

			await this.deleteFromDb(item.id)
			resolve(item)
		})
	}

	// returns first item from queue, or null if queue is empty
	getFirst() {
		return new Promise<QueueItem | null>((resolve, reject) => {
			this.db.get('SELECT * FROM queue LIMIT 1', function (err, item: QueueItem | undefined) {
				if (err) return reject(err)
				if (!item) return resolve(null)
				resolve(item)
			})
		})
	}

	// returns item by its id, or null if it's not found
	getById(id: string) {
		return new Promise<QueueItem | null>((resolve, reject) => {
			const db = this.db
			db.get('SELECT * FROM queue WHERE id=?', id, function (err, item: QueueItem | undefined) {
				if (err) return reject(err)
				if (!item) return resolve(null)
				resolve(item)
			})
		})
	}

	// starts autoqueue, makes sure it won't be duplicated if already running
	processItems() {
		if (!this.isRunning) {
			this.isRunning = true
			this.pullLoop()
		}
	}

	// pulls items out of queue until its empty
	private async pullLoop() {
		// fetch all items
		var item = await this.getFirst()
		while (item) {
			if (this.forEach) await this.forEach(item)
			await this.deleteFromDb(item.id)

			item = await this.getFirst()
		}

		// no more items in queue
		this.done?.()
		this.isRunning = false
	}

	// adds item to the queue. starts processing unless disabled with argument
	enqueue(item: QueueItem, startProcessing = true) {
		return new Promise<void>(async (resolve) => {
			await this.insertToDb(item)
			if (startProcessing) this.processItems()
			resolve()
		})
	}
}

export { ProcessQueue }
