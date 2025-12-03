import chatRoute from '@routes/api/chat/post'
import getThreadRoute from '@routes/api/thread/get'
import putThreadRoute from '@routes/api/thread/put'
import deleteThreadRoute from '@routes/api/thread/delete'
import getThreadStreamRoute from '@routes/api/thread/stream/get'
import getThreadsRoute from '@routes/api/threads/get'

export default {
  chat: {
    post: chatRoute,
  },
  thread: {
    put: putThreadRoute,
    get: getThreadRoute,
    delete: deleteThreadRoute,
    stream: {
      get: getThreadStreamRoute
    }
  },
  threads: {
    get: getThreadsRoute,
  },
}