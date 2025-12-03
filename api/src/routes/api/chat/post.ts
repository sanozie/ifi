// API
import type { Context } from 'hono'
// AI
import { webSearch } from '@exalabs/ai-sdk'
import {
  convertToModelMessages,
  generateId,
  type ModelMessage, streamText,
  StreamTextOnFinishCallback,
  tool,
  type UIMessage,
} from 'ai'
import { createResumableStreamContext } from 'resumable-stream'
// Packages
import { modelConfig, REPOS } from '@constants'
import { ModelConfig } from '@interfaces'
import { getThread, createThread, saveThread } from '@db'
import type { Thread } from '@generated/prisma/client'
// Utils
import { v4 as uuidV4 } from 'uuid'
import { closeSandboxTool, initPlannerSandboxTool } from '@providers/sandbox'
import { draftSpecTool, finalizeSpecTool, reportCompletionTool, updateSpecTool, updateTitleTool } from '@providers/mcp'
import { cliQueryTool } from '@providers/continue'


async function plan({ messages, onFinish, config = {} }:
                           {
                             messages: ModelMessage[],
                             onFinish?: StreamTextOnFinishCallback<any>
                             config?: Partial<ModelConfig>
                           }) {
  try {

    const mergedConfig = { ...modelConfig, ...config };

    /* --------------------------------------------------------------- */
    /* 1)  Function entry                                              */
    /* --------------------------------------------------------------- */
    console.log("[plan]▶️  ENTER");

    const mcptool: any = tool;

    // Assemble tools while forcing lightweight types to avoid deep inference
    const tools = {
      web_search: webSearch(),
      init_sandbox: initPlannerSandboxTool(mcptool) as any,
      close_sandbox: closeSandboxTool(mcptool) as any,
      cli_query: cliQueryTool(mcptool) as any,
      report_completion: reportCompletionTool(mcptool) as any,
      draft_spec: draftSpecTool(mcptool) as any,
      update_spec: updateSpecTool(mcptool) as any,
      finalize_spec: finalizeSpecTool(mcptool) as any,
      update_title: updateTitleTool(mcptool) as any,
    } as const;

    console.log(`[plan] 🛠️  Tools configured: ${Object.keys(tools).join(', ')}`);

    // Discover available repositories to inform the planner about valid targets
    const reposNote = REPOS.length
      ? `Accessible repositories : ${REPOS.join(', ')}`
      : `No repositories found. Do not reference any repository names unless they appear here when available.`;

    // System message that's always included
    const system = `
      You are Ifi, an AI engineering assistant that guides a user through THREE distinct stages.
      
      1. **Planning Discussion** – Conversational back-and-forth to understand the user’s goal.
      2. **Drafting Spec** – Produce a structured design/implementation spec that the user can review.
      3. **Finalization & Implementation** – After explicit user approval, queue an implementation job.
      
      ENVIRONMENT CONTEXT
      • ${reposNote}
      • You must only operate on repositories from this list. Never invent or assume a repository that does not exist.
      
      Determine the CURRENT INTENT from the latest user message:
      • If they are still clarifying requirements or asking questions → stay in *Planning Discussion*. Use the \`web_search\` tool to search for relevant information, and the \`cli_query\` tool to query the codebase directly.
      • If they indicate they are **ready to see a spec** ( e.g. “sounds good, can you draft a spec?” or “let’s proceed” ) → CALL the \`draft_spec\` tool exactly once.
      • If they explicitly **approve the draft spec** ( e.g. “looks good, ship it”, “approved”, “go ahead with implementation” ) → CALL the \`finalize_spec\` tool exactly once.
      
      The draft spec will be passed onto an expert coding AI agent. In order to give it the best chance of producing high-quality code, you must ensure that:
      1. The draft spec is created with the most amount of context possible embedded in the spec. This can include file names, line numbers, and other code context.
      3. Ideal implementation steps and intent are included within the spec.
      
      Tool usage rules:
      • Remember to initialize a sandbox in order to explore repos, and close the sandbox after use.
      • Never call \`draft_spec\` or \`finalize_spec\` without meeting the intent criteria above.
      • After calling a tool, wait for the tool response before progressing to the next stage.
      • When the overall task (including any necessary tool calls) is complete, CALL the \`reportCompletion\` tool **exactly once** with a one-sentence summary.
      
      General guidelines:
      • Keep all normal conversation messages concise and focused.
      • Make sure to use the update_title tool to make sure the title is always up-to-date with the overall thread. 
      • NEVER leak internal reasoning or tool call JSON to the user—only properly formatted tool calls.  
      • Do NOT output any completion text directly; the client UI renders results from tools.
      `;
    console.log(`[plan] 🚀 Calling streamText(model="${mergedConfig.plannerModel}") …`);

    // Delegate
    return streamText({
      model: mergedConfig.plannerModel,
      system,
      messages,
      tools,
      onFinish,
      stopWhen: (response: any) => response.toolCalls?.some(
        (call: { toolName?: string }) => call.toolName === 'reportCompletion',
      ),
    });
  } catch (error: any) {
    console.error("[plan] 🛑 Error: ", error.message);
    throw new Error(`Failed to plan: ${error.message}`);
  }
}

export default async (c: Context) => {
  try {
    console.log("[chat:post] ▶️  Incoming /api/chat");

    // Extract threadId and messages from the AI SDK request structure
    let { threadId, messages }: { threadId: string | undefined, messages: UIMessage[] } = await c.req.json()

    if (threadId) {
      console.log("[chat:post] 📋 Extracted threadId from AI SDK request:", threadId)
    } else {
      console.log("[chat:post] ⚠️  No threadId found in AI SDK request - will create new thread")
    }

    const modelMessages = convertToModelMessages(messages as any)

    // Create or get a thread
    let thread: Thread | null;

    if (threadId) {
      thread = await getThread(threadId);
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
      );
    }

    // Pass prior messages to retain context (exclude the one we just added)
    const planningContext: ModelMessage = { role: 'system', content: `Thread Context: threadId=${threadId}` };
    const originalMessages = [planningContext, ...modelMessages]
    const stream = await plan({ messages: originalMessages });

    console.log("[chat] ✅ plan() resolved");

    return stream.toUIMessageStreamResponse({
      originalMessages: messages,
      onFinish: ({ messages }) => {
        saveThread({ threadId: threadId!, chat: messages })
      },
      async consumeSseStream({ stream }) {
        const streamId = generateId();
        const streamContext = createResumableStreamContext({
          waitUntil(promise) {
            promise.catch(console.error)
          }
        })

        await streamContext.createNewResumableStream(streamId, () => stream)

        await saveThread({ threadId: threadId!, streamId })
      }
    })
  } catch (err: any) {
    console.error("[chat] 🛑 Error handling chat request:", err.message);
    // return c.res.status(500).json({ error: `Internal Server Error: ${err.message}` });
  }
}
