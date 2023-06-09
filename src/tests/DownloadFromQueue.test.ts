import fs from 'fs'
import { ProcessQueue } from '../modules/ProcessQueue'
import { ImageDb } from '../modules/ImageDb'
import { QueueItem } from '../models/QueueItem'

const imageDir = './downloads/'
const dbPath = './database/test-apq-w-download-images.sqlite'
const db = new ImageDb(dbPath, imageDir)
const queuePath = './database/test-apq-w-download-queue.sqlite'
const q = new ProcessQueue(queuePath)

beforeAll(async () => {
	await db.init()
	await db.wipe()
	await q.init()
	await q.wipe()
	for (let file of fs.readdirSync(imageDir)) if (file.startsWith('test2-')) fs.unlinkSync(imageDir + file)
})

// close databases and clear files
afterAll(async () => {
	for (let file of fs.readdirSync(imageDir)) if (file.startsWith('test2-')) fs.unlinkSync(imageDir + file)
	await q.close()
	fs.unlinkSync(queuePath)
	await db.close()
	fs.unlinkSync(dbPath)
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
			expect(await db.getById(id)).toBeTruthy()
		}
		done()
	}

	q.forEach = db.downloadImage

	q.enqueue(images[0])
	q.enqueue(images[1])
	q.enqueue(images[2])
}, 10000)
