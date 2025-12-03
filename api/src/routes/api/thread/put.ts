import type { Context } from 'hono'
import { prisma } from '@db'

export default async (c: Context) => {
  try {
    const { id } = c.req.param()
    const { title }: { title: string } = await c.req.json()

    if (!title || !title.trim()) {
      c.status(400)
      return c.json({ error: 'Invalid title' });
    }

    const updated = await prisma.thread.update({
      where: { id },
      data: { title: title.trim() },
      select: { id: true, title: true, created_at: true, updated_at: true },
    });

    return c.json(updated);
  } catch (err: any) {
    if (err.code === 'P2025') {
      c.status(404)
      return c.json({ error: 'Thread not found' });
    }
    console.error('PUT /v1/thread/:id error:', err);
    c.status(500)
    return c.json({ error: 'Internal Server Error' });
  }
}
