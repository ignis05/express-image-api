import { AutoProcessQueue } from '../modules/AutoProcessQueue'
import { ImageDb } from '../modules/ImageDb'
import fs from 'fs'
import { QueueItem } from '../models/QueueItem'

const imageDir = './downloads/'
const dbPath = './database/test-apq-w-download-images.sqlite'
const db = new ImageDb(dbPath, imageDir)
const queuePath = './database/test-apq-w-download-queue.sqlite'
const q = new AutoProcessQueue(queuePath, () => new Promise<void>((res) => res()))

beforeAll(async () => {
	await db.init()
	await db.wipe()
	await q.init()
	await q.queue.wipe()
	for (let file of fs.readdirSync(imageDir)) if (file.startsWith('test2-')) fs.unlinkSync(imageDir + file)
})

// close databases and clear files
afterAll((done) => {
	for (let file of fs.readdirSync(imageDir)) if (file.startsWith('test2-')) fs.unlinkSync(imageDir + file)
	q.queue.db.close(() => {
		fs.unlinkSync(queuePath)
		db.db.close(() => {
			fs.unlinkSync(dbPath)
			done()
		})
	})
})

test('downloads images as they are being inserted to the queue', (done) => {
	const images: QueueItem[] = [
		{ id: 'test2-img1', url: 'https://dummyimage.com/600x400/000/f00.png', date_queued: Date.now() },
		{ id: 'test2-img2', url: 'https://dummyimage.com/600x400/000/0f0.png', date_queued: Date.now() },
		{ id: 'test2-img3', url: 'https://dummyimage.com/600x400/000/00f.png', date_queued: Date.now() },
	]

	// test end
	q.done = async () => {
		// check if there is a file and db entry for each image
		for (let { id } of images) {
			expect(fs.existsSync(imageDir + id + '.png')).toBe(true)
			expect(await db.getbyId(id)).toBeTruthy()
		}
		done()
	}

	q.forEach = db.downloadImage

	q.addItem(images[0])
	q.addItem(images[1])
	q.addItem(images[2])
}, 10000)
