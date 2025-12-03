import type { Context } from 'hono'
import { prisma } from '@db'

export default async (c: Context ) => {
  try {
    const { id } = c.req.param();

    // Verify existence first
    const existing = await prisma.thread.findUnique({ where: { id } });
    if (!existing) {
      c.status(404)
      return c.json({ error: 'Thread not found' });
    }

    await prisma.thread.delete({
      where: { id },
    });

    return c.status(204);
  } catch (err) {
    console.error('DELETE /v1/threads/:id error:', err);
    c.status(500)
    return c.json({ error: 'Internal Server Error' });
  }
}
