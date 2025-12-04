import { tool } from 'ai'
import { z } from 'zod'
import { closeSandbox, createSandbox } from '@workflows/steps/sandbox'
import { cliQuery } from '@workflows/steps/continue'
import { reportCompletion } from '@workflows/steps/mcp'

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
    execute: createSandbox
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