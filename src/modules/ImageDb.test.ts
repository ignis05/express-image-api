import { ImageDb } from './ImageDb'
import fs from 'fs'

const imageDir = './downloads/'
const dbPath = './database/imagedb-test.sqlite'
const db = new ImageDb(dbPath, imageDir)

beforeAll(async () => {
	await db.init()
	await db.wipe()
	for (let file of fs.readdirSync(imageDir)) if (file.startsWith('test1-')) fs.unlinkSync(imageDir + file)
})

afterEach(async () => {
	await db.wipe()
	for (let file of fs.readdirSync(imageDir)) if (file.startsWith('test1-')) fs.unlinkSync(imageDir + file)
})

afterAll((done) => {
	db.db.close(() => {
		fs.unlinkSync(dbPath)
		done()
	})
})

test('downloads a file', async () => {
	const downloadedPath = './downloads/test1-id1.png'
	if (fs.existsSync(downloadedPath)) fs.unlinkSync(downloadedPath)

	await db.downloadImage({ id: 'test1-id1', url: 'https://dummyimage.com/600x400/000/fff.png', date_queued: Date.now() })
	expect(fs.existsSync(downloadedPath)).toBe(true)
})

test('writes to database after downloading', async () => {
	await db.downloadImage({ id: 'test1-id1', url: 'https://dummyimage.com/600x400/000/fff.png', date_queued: Date.now() })
	let item = await db.getById('test1-id1')
	expect(item).toBeTruthy()
})
