import { Sandbox } from '@vercel/sandbox'
import { z } from 'zod'

const runContinueCliQuery = async ({ query, sandbox }: { query: string; sandbox: Sandbox }) => {
  const runner = await sandbox.runCommand('cn', ['--config', './.continue/config.yaml', '-p', '--auto', query])

  const res = {
    stdout: await runner.stdout() || null,
    stderr: await runner.stderr() || null,
    exitCode: runner.exitCode,
  }

  console.log(JSON.stringify(res))
  return res
}

export function cliQueryTool(mcptool: any) {
  return mcptool({
    name: 'cliQuery',
    description:
      'This tool allows you to interact with an AI deployed in the cli of the Sandbox instance. The query should be formatted as a natural language question, formatted as human-like full sentences. Provide as much detail as possible to ensure the CLI AI is able to process your query in full.',
    inputSchema: z.object({
      query: z.string().describe('Natural language instructions to be passed to the CLI AI.'),
      sandboxId: z.string().describe('ID of the Sandbox instance to use for the query. Must be provided. If you do not have a Sandbox instance, use the initSandbox tool first.'),
    }),
    async execute({ query, sandboxId }: { query: string; sandboxId: string; }) {
      try {
        const sandbox = await Sandbox.get({ sandboxId })
        return await runContinueCliQuery({ query, sandbox })
      } catch (e) {
        console.error('sandbox error', e)
        return e
      }
    },
  }) as any;
}