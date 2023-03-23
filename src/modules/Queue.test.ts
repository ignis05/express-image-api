import { Queue } from './Queue'

const q = new Queue('./database/queue.sqlite')

beforeEach(async () => {
	await q.init()
	await q.wipe()
})

afterEach(async () => {
	await q.wipe()
})

test('can add and retrieve item', async () => {
	let item = { id: 'qwerty', url: '123' }

	let res = await q.addItem(item)
	expect(res).toEqual(true)

	let item2 = await q.getItem()
	expect(item2).toEqual(item)
})

test('returns null when getting item from empty queue', async () => {
	let item = await q.getItem()
	expect(item).toEqual(null)
})

test('works in fifo order', async () => {
	let item1 = { id: 'qwerty', url: '123' }
	let item2 = { id: 'qwerty2', url: '1234' }

	await q.addItem(item1)
	await q.addItem(item2)

	let res1 = await q.getItem()
	let res2 = await q.getItem()

	expect(res1).toEqual(item1)
	expect(res2).toEqual(item2)
})
