import { Hono } from 'hono'
import { start } from 'workflow/api'
import { handleJob } from './workflows/job.js'

const app = new Hono()

app.get('/api/signup', async (c) => {
  await start(handleJob, [{ jobId: 'cmil89zce000004i84k12r01b' }])
  return c.json({ message: "User signup workflow started" })
})

export default app
