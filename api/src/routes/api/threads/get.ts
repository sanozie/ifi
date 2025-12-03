import type { Context } from 'hono'
import { getThreads } from '@db'

export default async (c: Context ) => {
  console.log(`[threads] ▶️  Incoming /v1/threads`);
  try {
    console.log(`[threads] 📂 Loaded existing threads`);
    const threads = await getThreads()

    const payload = threads.map((t) => ({
      id: t.id,
      title: t.title,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));

    console.log(`[threads] 📂 returning ${payload.length} threads`);
    return c.json(payload);
  } catch (err) {
    console.error('GET /v1/threads error:', err);
    c.status(500)
    return c.json({ error: 'Internal Server Error' });
  }
}
