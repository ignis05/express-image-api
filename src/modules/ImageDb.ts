import sqlite3 from 'sqlite3'
import fs from 'fs'
import path from 'path'
import { QueueItem } from '../models/QueueItem'
import { ImageItem } from '../models/ImageItem'
import Axios from 'axios'

class ImageDb {
	dbPath: string
	imageDir: string
	db: sqlite3.Database
	isReady: boolean

	constructor(dbPath: string, imageDir: string) {
		this.dbPath = dbPath
		this.imageDir = imageDir

		// check if db file exists, create it if not
		this.isReady = fs.existsSync(dbPath)
		if (!this.isReady) fs.openSync(dbPath, 'w')

		this.db = new sqlite3.Database(dbPath)

		this.downloadImage = this.downloadImage.bind(this) // keeps context when called from processqueue
	}

	// initialises tables if db was freshly created
	init() {
		return new Promise<void>(async (resolve, reject) => {
			if (this.isReady) return resolve()

			this.db.all(
				`CREATE TABLE images (
          id VARCHAR(50) NOT NULL PRIMARY KEY,
          source_url VARCHAR(255) NOT NULL,
          local_url VARCHAR(255) NOT NULL,
          date_added INTEGER NOT NULL,
          date_downloaded INTEGER NOT NULL
          )`,
				(err, rows) => {
					if (err) return reject(err)
					this.isReady = true
					resolve()
				}
			)
		})
	}

	// deletes everything from database
	wipe() {
		return new Promise<void>(async (resolve, reject) => {
			this.db.all(`DELETE FROM images`, (err, rows) => {
				if (err) return reject(err)
				resolve()
			})
		})
	}

	// inserts item data to db
	insert(item: ImageItem) {
		return new Promise<void>((resolve, reject) => {
			this.db.all(
				`INSERT INTO images VALUES (?,?,?,?,?)`,
				[item.id, item.source_url, item.local_url, item.date_added, item.date_downloaded],
				(err, rows) => {
					if (err) return reject(err)
					resolve()
				}
			)
		})
	}

	// function that downloads image and adds it to the database. designed to fit into AutoprocessQueue#forEach
	downloadImage(item: QueueItem) {
		return new Promise<void>(async (resolve, reject) => {
			const url = item.url
			const fileExt = url.split('.').at(-1) || '.png'
			const dlPath = path.join(this.imageDir, `${item.id}.${fileExt}`)

			const res = await Axios({ url, method: 'GET', responseType: 'stream' }).catch((err) => {
				console.log(`Failed to fetch image from ${url}, got error ${err.code}`)
			})

			// failed to fetch data
			if (!res?.data) return resolve()

			res.data
				.pipe(fs.createWriteStream(dlPath))
				.on('error', reject)
				.once('close', async () => {
					await this.insert({
						id: item.id,
						source_url: url,
						local_url: `/image/${item.id}.${fileExt}`,
						date_added: item.date_queued,
						date_downloaded: Date.now(),
					})
					resolve()
				})
		})
	}

	getById(id: string) {
		return new Promise<ImageItem | null>((resolve, reject) => {
			this.db.get('SELECT * FROM images WHERE id=?', id, function (err, item: ImageItem | undefined) {
				if (err) return reject(err)
				if (!item) return resolve(null)
				resolve(item)
			})
		})
	}

	getListPart(limit: number, offset: number) {
		return new Promise<ImageItem[]>((resolve, reject) => {
			this.db.all('SELECT * FROM images LIMIT ? OFFSET ?', [limit, offset], function (err, items: ImageItem[]) {
				if (err) return reject(err)
				resolve(items)
			})
		})
	}
}

export { ImageDb }
