import { Hono } from 'hono'
import { start } from 'workflow/api'
import { handleJob } from './workflows/job.js'

const app = new Hono()

app.get('/', async (c) => {
  await start(handleJob, [{ jobId: 'cmil89zce000004i84k12r01b' }])
  return c.json({ message: "Job Queued for cmil89zce000004i84k12r01b" })
})

export default app
