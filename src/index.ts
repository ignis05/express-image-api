import express, { Express } from 'express'

const port = 3000
const app: Express = express()



// init db and launch server
async function main() {
	// await db.open()

	console.log(`App running on http://localhost:${port}`)
	app.listen(port)
}
main()
