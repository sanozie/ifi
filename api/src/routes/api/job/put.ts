import type { Context } from 'hono'
import { start } from 'workflow/api'
import { handleJob } from '@workflows/worker'

export default async (c: Context) => {
  try {
    const { id } = c.req.param()
    const run = await start(handleJob, [{ jobId: id }])
    return c.text(`Job queued for job ${id}, run ${run.runId}`)
  } catch (err) {
    console.error('GET /v1/thread/:id/stream error:', err);
    c.status(500)
    c.json({ error: 'Internal Server Error' });
  }
}
