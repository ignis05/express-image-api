import express, { Express } from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import { Md5 } from 'ts-md5'
import { URL } from 'url'

import { ImageDb } from './modules/ImageDb'
import { ProcessQueue } from './modules/ProcessQueue'

const port = 3000

const imageDB = new ImageDb('../database/images.sqlite', '../downloads/')
const processQueue = new ProcessQueue('../database/queue.sqlite')
processQueue.forEach = imageDB.downloadImage // trigger image download method for each item pulled from queue

const app: Express = express()
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use('/image', express.static('../downloads/'))

// returns image details
app.get('/details/:id', async (req, res) => {
	const id = req.params.id
	const image = await imageDB.getById(id)

	if (!image) return res.status(404).send('No image with matching id found')

	res.status(200).send(image)
})

// checks if item has been downloaded
//? What about items that fail to download due to inaccessible url?
//? Currently the api deletes them, but it might be more desirable to keep them in db, and this feature would send information that url could not be accessed
app.get('/check/:id', async (req, res) => {
	const id = req.params.id

	const queueItem = await processQueue.getById(id)
	if (queueItem) return res.status(200).send({ status: 'waiting' })

	const imageItem = await imageDB.getById(id)
	if (imageItem) return res.status(200).send({ status: 'downloaded', url: imageItem.local_url })

	return res.status(404).send('No image with matching id found')
})

// adds new image to download queue
app.post('/add', async (req, res) => {
	const url: string | undefined = req.body.url
	if (!url) return res.status(400).send('No url in request body')

	// make sure url is valid, to skip saving to databases something that will fail to download anyway
	try {
		new URL(url)
	} catch {
		return res.status(400).send('Specified "url" in not a valid url string')
	}

	const id = Md5.hashStr(url)

	//? Allow adding duplicate images? Currently only unique urls are allowed, if image is already in queue/database, api skips to sending /check link
	if (!(await imageDB.getById(id)) && !(await processQueue.getById(id))) await processQueue.enqueue({ id, url, date_queued: Date.now() })

	res.status(201).send({ check_url: `/check/${id}` })
})

// gets list of images, limited by count and offset
app.get('/list', async (req, res) => {
	let qCount = req.query.count
	let qOffset = req.query.offset

	// assing count and offset from querystring, if they are valid numbers
	let count = 5
	if (typeof qCount == 'string' && !isNaN(parseInt(qCount))) count = parseInt(qCount)
	let offset = 0
	if (typeof qOffset == 'string' && !isNaN(parseInt(qOffset))) offset = parseInt(qOffset)

	//? API allows to fetch whole databse at once, a potential upper limit on count might be warranted, but nothing was specified

	let listPart = await imageDB.getListPart(count, offset)
	res.status(200).send({ requestedCount: count, offset: offset, actualCount: listPart.length, images: listPart })
})

// init databases and launch server
async function main() {
	await imageDB.init()
	await processQueue.init()

	// continue downloading images that are still in the queue
	processQueue.processItems()

	console.log(`App running on http://localhost:${port}`)
	app.listen(port)
}
main()
