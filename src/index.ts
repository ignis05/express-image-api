import express, { Express } from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import { Md5 } from 'ts-md5'

import { ImageDb } from './modules/ImageDb'
import { AutoProcessQueue } from './modules/AutoProcessQueue'

const port = 3000

const imageDB = new ImageDb('../database/images.sqlite', '../downloads/')
const processQueue = new AutoProcessQueue('../database/queue.sqlite', imageDB.downloadImage)

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
app.get('/check/:id', async (req, res) => {
	const id = req.params.id

	const queueItem = await processQueue.getById(id)
	if (queueItem) return res.status(200).send({ status: 'waiting' })

	const imageItem = await imageDB.getById(id)
	if (imageItem) return res.status(200).send({ status: 'downloaded', url: imageItem.local_url })

	return res.status(404).send('No image with matching id found')
})

app.post('/add', async (req, res) => {
	const url: string | undefined = req.body.url
	if (!url) return res.status(400).send('No url in request body')

	const id = Md5.hashStr(url)

	//? only add if image with this source url isn't already in queue/database. If image is already known, skip to sending check url
	if (!(await imageDB.getById(id)) && !(await processQueue.getById(id))) await processQueue.addItem({ id, url, date_queued: Date.now() })

	res.status(201).send({ check_url: `/check/${id}` })
})

// init databases and launch server
async function main() {
	await imageDB.init()
	await processQueue.init()

	console.log(`App running on http://localhost:${port}`)
	app.listen(port)
}
main()
