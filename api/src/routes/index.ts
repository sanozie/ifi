import chatRoute from '@routes/api/chat/post'
import getThreadRoute from '@routes/api/thread/get'
import putThreadRoute from '@routes/api/thread/put'
import deleteThreadRoute from '@routes/api/thread/delete'
import getThreadStreamRoute from '@routes/api/thread/stream/get'
import getThreadsRoute from '@routes/api/threads/get'
import putJobRoute from '@routes/api/job/put'
import githubWebhookRoute from '@routes/api/webhook/github/post'

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
  webhook: {
    github: {
      post: githubWebhookRoute
    }
  },
  job: {
    put: putJobRoute
  }
}