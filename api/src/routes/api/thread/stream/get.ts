import type { Context } from 'hono'
import { getRun } from 'workflow/api'
import { createUIMessageStreamResponse } from 'ai'

export default async (c: Context ) => {
  try {
    const { id } = c.req.param();
    const { startIndex: startIndexParam } = c.req.query()
    const startIndex = startIndexParam
      ? parseInt(startIndexParam, 10)
      : undefined;

    const run = getRun(id);
    const stream = run.getReadable({ startIndex });

    return createUIMessageStreamResponse({ stream });
  } catch (err) {
    console.error('GET /v1/thread/:id/stream error:', err);
    c.status(500)
    c.json({ error: 'Internal Server Error' });
  }
}
