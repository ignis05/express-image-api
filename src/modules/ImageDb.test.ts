import { ImageDb } from './ImageDb'
import fs from 'fs'
import { ImageItem } from '../models/ImageItem'

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

test('returns image list parts', async () => {
	let images: ImageItem[] = [
		{ id: 'item1', date_added: 0, date_downloaded: 0, local_url: 'a', source_url: 'a' },
		{ id: 'item2', date_added: 0, date_downloaded: 0, local_url: 'a', source_url: 'a' },
		{ id: 'item3', date_added: 0, date_downloaded: 0, local_url: 'a', source_url: 'a' },
		{ id: 'item4', date_added: 0, date_downloaded: 0, local_url: 'a', source_url: 'a' },
		{ id: 'item5', date_added: 0, date_downloaded: 0, local_url: 'a', source_url: 'a' },
	]

	for (let img of images) {
		await db.insert(img)
	}

	let ret1 = await db.getListPart(2, 0)
	expect(ret1).toEqual(images.slice(0, 2))

	let ret2 = await db.getListPart(2, 2)
	expect(ret2).toEqual(images.slice(2, 4))

	let ret3 = await db.getListPart(2, 4)
	expect(ret3).toEqual(images.slice(4, 5))
})
