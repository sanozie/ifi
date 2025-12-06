import { Sandbox } from '@vercel/sandbox'

const runContinueCliQuery = async ({ query, sandbox, context }: { query: string; sandbox: Sandbox; context: 'planner' | 'worker' }) => {
  console.log(`[run query] query: ${query}`)

  // Write query to a temporary file to handle multiline content
  const workDir = context === 'worker' ? './tmp' : './'
  const queryFile = `${workDir}/.cn-query-tmp.txt`
  await sandbox.writeFiles([{
    path: queryFile,
    content: Buffer.from(query, 'utf-8')
  }])

  const runner = await sandbox.runCommand({
    cmd: 'sh',
    cwd: workDir,
    args: ['-c', `cn --config ./.continue/config.yaml -p --auto "$(cat .cn-query-tmp.txt)"`]
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
