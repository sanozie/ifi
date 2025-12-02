import { Hono } from 'hono'
import { start } from 'workflow/api'
import { handleJob } from '@workflows/job.js'

const app = new Hono()

app.get('/job', async (c) => {
  await start(handleJob, ['cmil89zce000004i84k12r01b'])
  return c.json({ message: "Job Queued for cmil89zce000004i84k12r01b" })
})

app.get('/', async (c) => {
  return c.text('ye')
})


export default app
