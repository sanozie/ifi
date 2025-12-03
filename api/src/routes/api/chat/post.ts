// API
import type { Context } from 'hono'
// AI
import {
  convertToModelMessages, createUIMessageStreamResponse,
  type ModelMessage,
  type UIMessage,
} from 'ai'
import { plan } from '@workflows/planner'
// Packages
import { getThread, createThread, saveThread } from '@db'
import type { Thread } from '@db/generated/client'
// Utils
import { v4 as uuidV4 } from 'uuid'
import { start } from 'workflow/api'

export default async (c: Context) => {
  try {
    console.log("[chat:post] ▶️  Incoming /api/chat")

    // Extract threadId and messages from the AI SDK request structure
    let { threadId, messages }: { threadId: string | undefined, messages: UIMessage[] } = await c.req.json()

    if (threadId) {
      console.log("[chat:post] 📋 Extracted threadId from AI SDK request:", threadId)
    } else {
      console.log("[chat:post] ⚠️  No threadId found in AI SDK request - will create new thread")
    }

    const modelMessages = convertToModelMessages(messages as any)

    // Create or get a thread
    let thread: Thread | null

    if (threadId) {
      thread = await getThread(threadId)
      if (!thread) {
        // Thread doesn't exist with provided ID, create a new one with this ID
        console.log(`[chat:post] 🔎 Thread not found: ${threadId}, creating new thread with this ID`)
        const title = 'New Thread'
        thread = await createThread({ title, chat: modelMessages, id: threadId })
        threadId = thread.id;
        console.log(`[chat:post] 🆕 Created new thread with provided ID ${threadId} and title="${title}"`)
      } else {
        console.log(`[chat:post] 📂 Loaded existing thread ${threadId}`)
      }
    } else {
      const title = 'New Thread'
      thread = await createThread({ title, chat: modelMessages, id: uuidV4() })
      threadId = thread.id;
      console.log(
        `[chat:post] 🆕 Created new thread ${thread.id} with title="${title}"`,
      )
    }

    // Pass prior messages to retain context (exclude the one we just added)
    const planningContext: ModelMessage = { role: 'system', content: `Thread Context: threadId=${threadId}` }
    const messageContext = [planningContext, ...modelMessages]
    const run = await start(plan, [{ messages: messageContext }])

    console.log("[chat] ✅ plan() resolved")

    return createUIMessageStreamResponse({
      stream: run.readable,
      headers: {
        'x-workflow-run-id': run.runId,
      },
    })
  } catch (err: any) {
    console.error("[chat] 🛑 Error handling chat request:", err.message);
    // return c.res.status(500).json({ error: `Internal Server Error: ${err.message}` });
  }
}
