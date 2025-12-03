import type { Context } from 'hono'
import { getThread } from '@db'

export default async (c: Context ) => {
  console.log(`[thread] ▶️  Incoming /api/thread/:id`)
  try {
    const { id } = c.req.param()
    console.log(`[thread] ▶️  Requesting thread ${id}`)
    const thread = await getThread(id)

    if (!thread) {
      c.status(404)
      return c.json({ error: 'Thread not found' })
    }

    // Return only the fields expected by the iOS client
    const payload = {
      id: thread.id,
      title: thread.title,
      createdAt: thread.created_at,
      updatedAt: thread.updated_at,
      chat: thread.chat
    };

    console.log(`[thread] ▶️  Returning thread ${id}`)
    return c.json(payload);
  } catch (err) {
    console.error('GET /api/thread/:id error:', err);
    c.status(500)
    return c.json({ error: 'Internal Server Error' });
  }
}
