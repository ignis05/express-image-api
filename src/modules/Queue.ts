import sqlite3 from 'sqlite3'
import fs from 'fs'
import { QueueItem } from '../models/QueueItem'

class Queue {
	dbPath: string
	db: sqlite3.Database
	isReady: boolean

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
	addItem(item: QueueItem) {
		return new Promise<boolean>((resolve, reject) => {
			this.db.all(`INSERT INTO queue VALUES (?,?,?)`, [item.id, item.url, item.date_queued], (err, rows) => {
				if (err) return reject(err)
				resolve(true)
			})
		})
	}

	// returns first item from queue, removing it from the queue. Returns null if queue is empty
	popItem() {
		return new Promise<QueueItem | null>(async (resolve, reject) => {
			let item = await this.getItem()

			if (!item) return resolve(null)

			await this.removeByID(item.id)
			resolve(item)
		})
	}

	// returns first item from queue, or null if queue is empty
	getItem() {
		return new Promise<QueueItem | null>((resolve, reject) => {
			this.db.get('SELECT * FROM queue LIMIT 1', function (err, item: QueueItem | undefined) {
				if (err) return reject(err)
				if (!item) return resolve(null)
				resolve(item)
			})
		})
	}

	removeByID(id: string) {
		return new Promise<void>((resolve, reject) => {
			this.db.all('DELETE FROM queue WHERE id=(?)', id, (err, rows) => {
				if (err) return reject(err)
				resolve()
			})
		})
	}

	// returns item by its id, or null if it's not found
	getByID(id: string) {
		return new Promise<QueueItem | null>((resolve, reject) => {
			const db = this.db
			db.get('SELECT * FROM queue WHERE id=?', id, function (err, item: QueueItem | undefined) {
				if (err) return reject(err)
				if (!item) return resolve(null)
				resolve(item)
			})
		})
	}
}

export { Queue }
