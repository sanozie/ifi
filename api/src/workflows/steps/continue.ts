import { Sandbox } from '@vercel/sandbox'

const runContinueCliQuery = async ({ query, sandbox, context }: { query: string; sandbox: Sandbox; context: 'planner' | 'worker' }) => {
  console.log(`[run query] query: ${query}`)
  const runner = await sandbox.runCommand({
    cmd: 'cn',
    cwd: context === 'worker' ? 'tmp' : '.',
    args: ['--config', './.continue/config.yaml', '-p', '--auto', `"${query}"`]
  })

  const res = {
    stdout: await runner.stdout() || null,
    stderr: await runner.stderr() || null,
    exitCode: runner.exitCode,
  }

  console.log(JSON.stringify(res))
  return res
}

export async function plannerCliQuery({ query, sandboxId }: { query: string; sandboxId: string; }) {
  "use step"

  const sandbox = await Sandbox.get({ sandboxId })
  return await runContinueCliQuery({ query, sandbox, context: 'planner' })
}

export async function workerCliQuery({ query, sandboxId }: { query: string; sandboxId: string; }) {
  "use step"

  const sandbox = await Sandbox.get({ sandboxId })
  return await runContinueCliQuery({ query, sandbox, context: 'worker' })
}
