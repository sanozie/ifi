import { type ModelMessage, streamText, type StreamTextOnFinishCallback, tool, type UIMessageChunk } from 'ai'
import type { ModelConfig } from '@interfaces'
import { modelConfig, REPOS } from '@constants'
import { DurableAgent } from '@workflow/ai/agent'
import { getWritable } from 'workflow'
import { plannerTools } from '@providers'

export async function plan({ messages }: { messages: ModelMessage[] }) {
  "use workflow"

  /* --------------------------------------------------------------- */
  /* 1)  Function entry                                              */
  /* --------------------------------------------------------------- */
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
  console.log(`[plan] 🚀 Calling streamText(model="${modelConfig.plannerModel}") …`);

  const writable = getWritable<UIMessageChunk>();

  const agent = new DurableAgent({
    model: modelConfig.plannerModel,
    system,
    tools: plannerTools,
  })

  await agent.stream({
    messages,
    stopWhen: (response: any) => response.toolCalls?.some(
      (call: { toolName?: string }) => call.toolName === 'reportCompletion',
    ),
    writable
  })
}