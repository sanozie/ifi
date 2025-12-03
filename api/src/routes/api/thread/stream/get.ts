import type { Context } from 'hono'
import { getThread } from '@db'
import { createResumableStreamContext } from 'resumable-stream'

export default async (c: Context ) => {
  try {
    const { id } = c.req.param();
    const thread = await getThread(id);

    if (!thread?.stream_id) {
      c.status(404)
      return c.json({ error: 'Thread not found' });
    }

    console.log(`[stream] found stream id of thread: ${thread.stream_id}`)

    const streamContext = createResumableStreamContext({ waitUntil: (promise) => promise.catch(console.error) });
    const stream = await streamContext.resumeExistingStream(thread?.stream_id)

    if (!stream) {
      c.status(404)
      return c.json({ error: 'Stream not found' });
    }


    c.header("Content-Type", "text/event-stream");
    c.header("x-vercel-ai-ui-message-stream", "v1");
    console.log(`[stream] found full stream`)

    return c.body(stream)
  } catch (err) {
    console.error('GET /v1/thread/:id/stream error:', err);
    c.status(500)
    c.json({ error: 'Internal Server Error' });
  }
}
