import Axios from 'axios'

async function main() {
	let res = await Axios.post('http://localhost:3000/add', { url: 'https://dummyimage.com/150x100/000/fff.png' })
	console.log(res.data)

	let checkUrl = res.data.check_url
	if (!checkUrl) return console.error('no check url')

	res = await Axios.get(`http://localhost:3000${checkUrl}`)
	console.log(res.data)

	await new Promise((r) => setTimeout(r, 1000)) // 1 sec timeout

	res = await Axios.get(`http://localhost:3000${checkUrl}`)
	console.log(res.data)
}
main()
