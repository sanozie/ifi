import { Hono } from 'hono'
import api from '@routes'

const app = new Hono()

app.get('/', (c) => {
  return c.text('ye')
})

// Chat Routes
app.post('/api/chat', api.chat.post)

// Thread Routes
app.get('/api/thread/:id', api.thread.get)
app.put('/api/thread/:id', api.thread.put)
app.delete('/api/thread/:id', api.thread.delete)

// Thread Stream Routes
app.get('/api/thread/:id/stream', api.thread.stream.get)

// Threads Routes
app.get('/api/threads', api.threads.get)

export default app
