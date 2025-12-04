import { tool } from 'ai'
import { z } from 'zod'
import { closeSandbox, createPlannerSandbox, createWorkerSandbox } from '@workflows/steps/sandbox'
import { cliQuery } from '@workflows/steps/continue'
import { draftSpec, finalizeSpec, reportCompletion, updateSpec, updateTitle } from '@workflows/steps/mcp'
import { webSearch } from '@exalabs/ai-sdk'

export const workerTools = {
  create_sandbox: tool({
    name: 'createSandbox',
    description:
      'Initializes a Vercel Sandbox for the planner to use. Will clone the passed in repository when created. This is a one-time operation and should be called before performing any other operations on the codebase.',
    inputSchema: z.object({
      repo: z
        .string()
        .describe('Repository name. Should not be in owner/repo format, but just the repo name without the owner.'),
    }),
    outputSchema: z.object({
      sandboxId: z.string().describe('ID of the Sandbox instance. Will be used in other tools to interact with the Sandbox instance.'),
    }),
    execute: createWorkerSandbox
  }),
  close_sandbox: tool({
    name: 'closeSandbox',
    description:
      'Closes the Sandbox instance associated with the given sandboxId. This must be called when the tool is done with the Sandbox instance, before reporting completion',
    inputSchema: z.object({
      sandboxId: z.string().describe('ID of the Sandbox instance to close.'),
    }),
    execute: closeSandbox
  }),
  cli_query: tool({
    name: 'cliQuery',
    description:
      'This tool allows you to interact with an AI deployed in the cli of the Sandbox instance. The query should be formatted as a natural language question, formatted as human-like full sentences. Provide as much detail as possible to ensure the CLI AI is able to process your query in full.',
    inputSchema: z.object({
      query: z.string().describe('Natural language instructions to be passed to the CLI AI.'),
      sandboxId: z.string().describe('ID of the Sandbox instance to use for the query. Must be provided. If you do not have a Sandbox instance, use the initSandbox tool first.'),
    }),
    execute: cliQuery
  }),
  report_completion: tool({
    name: 'reportCompletion',
    description:
      'Call this exactly once when you have produced the final plan. The summary should be a concise, one-sentence description of what you accomplished.',
    inputSchema: z.object({
      summary: z.string(),
      code: z.number().optional(),
    }),
    execute: reportCompletion
  })
}

export const plannerTools = {
  web_search: webSearch(),
  create_sandbox: tool({
    name: 'createSandbox',
    description:
      'Initializes a Vercel Sandbox for the planner to use. Will clone the passed in repository when created. This is a one-time operation and should be called before performing any other operations on the codebase.',
    inputSchema: z.object({
      repo: z
        .string()
        .describe('Repository name. Should not be in owner/repo format, but just the repo name without the owner.'),
    }),
    outputSchema: z.object({
      sandboxId: z.string().describe('ID of the Sandbox instance. Will be used in other tools to interact with the Sandbox instance.'),
    }),
    execute: createPlannerSandbox
  }),
  close_sandbox: tool({
    name: 'closeSandbox',
    description:
      'Closes the Sandbox instance associated with the given sandboxId. This must be called when the tool is done with the Sandbox instance, before reporting completion',
    inputSchema: z.object({
      sandboxId: z.string().describe('ID of the Sandbox instance to close.'),
    }),
    execute: closeSandbox
  }),
  cli_query: tool({
    name: 'cliQuery',
    description:
      'This tool allows you to interact with an AI deployed in the cli of the Sandbox instance. The query should be formatted as a natural language question, formatted as human-like full sentences. Provide as much detail as possible to ensure the CLI AI is able to process your query in full.',
    inputSchema: z.object({
      query: z.string().describe('Natural language instructions to be passed to the CLI AI.'),
      sandboxId: z.string().describe('ID of the Sandbox instance to use for the query. Must be provided. If you do not have a Sandbox instance, use the initSandbox tool first.'),
    }),
    execute: cliQuery
  }),
  report_completion: tool({
    name: 'reportCompletion',
    description:
      'Call this exactly once when you have produced the final plan. The summary should be a concise, one-sentence description of what you accomplished.',
    inputSchema: z.object({
      summary: z.string(),
      code: z.number().optional(),
    }),
    execute: reportCompletion
  }),
  draft_spec: tool({
    name: 'draftSpec',
    description:
      'Create a draft design spec for a given thread based on the conversation so far.',
    inputSchema: z.object({
      threadId: z.string().describe('ID of the thread for which to draft the spec'),
      repo: z.string().describe('Target repository for the spec, in all lowercase)'),
    }),
    execute: draftSpec
  }),
  update_spec: tool({
    name: 'updateSpec',
    description:
      'Update a draft design spec for a given thread based on the conversation so far.',
    inputSchema: z.object({
      specId: z.string().describe('ID of the existing spec to update. If not provided, a new spec will be created.'),
      title: z.string().optional().describe('Title for the spec. If not provided, the title will be derived from the first line of the spec content.'),
      repo: z.string().optional().describe('Target repository for the spec, in all lowercase)'),
      content: z.string().optional().describe('Existing spec content to update. Will fully replace the existing spec content.')
    }),
    execute: updateSpec
  }),
  finalize_spec: tool({
    name: 'finalizeSpec',
    description:
      'Finalize the latest draft spec for a thread and create a queued implementation job.',
    inputSchema: z.object({
      threadId: z.string().describe('ID of the thread whose spec should be finalized'),
    }),
    execute: finalizeSpec,
  }),
  update_title: tool({
    name: 'updateTitle',
    description:
      'Update the title of a conversation thread. Use this sparingly when the overall topic or goal changes significantly.',
    inputSchema: z.object({
      threadId: z.string().describe('ID of the thread to rename'),
      title: z.string().min(3).max(120).describe('A concise, human-friendly title that summarizes the thread'),
    }),
    execute: updateTitle
  })
}