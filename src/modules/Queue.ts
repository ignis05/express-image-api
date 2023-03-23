import sqlite3 from 'sqlite3'
import fs from 'fs'

interface QueueItem {
	id: string
	url: string
}

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
		return new Promise<void>(async (resolve) => {
			if (this.isReady) return resolve()

			this.db.run(
				`CREATE TABLE queue (
          id VARCHAR(50) NOT NULL PRIMARY KEY,
          url VARCHAR(255) NOT NULL
          )`,
				(err) => {
					this.isReady = true
					resolve()
				}
			)
		})
	}

	// deletes everything from queue
	wipe() {
		return new Promise<void>(async (resolve) => {
			this.db.run(`DELETE FROM queue`, function (err) {
				resolve()
			})
		})
	}

	// resolves false if db insert fails
	addItem(item: QueueItem) {
		return new Promise<boolean>((resolve) => {
			this.db.run(`INSERT INTO queue VALUES (?,?)`, [item.id, item.url], function (err) {
				if (err) {
					console.log(err.message)
					return resolve(false)
				}
				console.log(`Item was added to the queue: ${this.lastID}`)
				resolve(true)
			})
		})
	}

	// resolves item or null if queue is empty
	getItem() {
		return new Promise<QueueItem | null>((resolve) => {
			const db = this.db
			db.get('SELECT * FROM queue LIMIT 1', function (err, item: QueueItem | undefined) {
				if (!item) return resolve(null)
				db.run('DELETE FROM queue WHERE id=(?)', item.id, function (err) {
					resolve(item)
				})
			})
		})
	}
}

export { Queue }
export type { QueueItem }
