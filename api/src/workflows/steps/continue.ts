import { Sandbox } from '@vercel/sandbox'

const runContinueCliQuery = async ({ query, sandbox }: { query: string; sandbox: Sandbox }) => {
  console.log(`[run query] query: ${query}`)
  const runner = await sandbox.runCommand('cn', ['--config', './.continue/config.yaml', '-p', '--auto', `"${query}"`])

  const res = {
    stdout: await runner.stdout() || null,
    stderr: await runner.stderr() || null,
    exitCode: runner.exitCode,
  }

  console.log(JSON.stringify(res))
  return res
}

export async function cliQuery({ query, sandboxId }: { query: string; sandboxId: string; }) {
  "use step"

  const sandbox = await Sandbox.get({ sandboxId })
  return await runContinueCliQuery({ query, sandbox })
}