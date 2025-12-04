import { Sandbox } from '@vercel/sandbox'
import ms from 'ms'
import { CONTINUE_WORKER_CONFIG } from '@constants'

const initSandbox = async ({ repo }: { repo: string }) => {
  "use step"
  console.log(`[sandbox] initializing sandbox for repo ${repo}`)
  // Create Sandbox
  const sandbox = await Sandbox.create({
    source: {
      url: `https://github.com/sanozie/${repo}.git`,
      type: 'git',
      username: "x-access-token",
      password: process.env.GITHUB_TOKEN
    },
    resources: { vcpus: 2 },
    timeout: ms('15m'),
    runtime: 'node22'
  })

  console.log(`[sandbox] sandbox initialized for repo ${repo}: ${sandbox.sandboxId}`)
  return sandbox
}

const configureSandbox = async ({ sandbox, continueConfig }: { sandbox: Sandbox, continueConfig: string }) => {
  "use step"
  await sandbox.runCommand({
    cmd: 'npm',
    args: ['install', '-g', '@continuedev/cli'],
    sudo: true,
  })
  console.log(`[sandbox] continue cli installed}`)

  await sandbox.mkDir('.continue')
  await sandbox.mkDir('.continue/.continue')
  await sandbox.writeFiles([{
    path: `.continue/.continue/config.yaml`,
    content: Buffer.from(continueConfig)
  }])

  console.log(`[sandbox] continue config written @ .continue/.continue/config.yaml`)


  // Git Operations
  const gitCredentialHelper = await sandbox.runCommand({
    cmd: 'git',
    args: ['config', '--global', 'credential.helper', 'store'],
  })

  await sandbox.runCommand({
    cmd: 'echo',
    args: [`https://x-access-token:${process.env.GITHUB_TOKEN}@github.com`, '>', '~/.git-credentials'],
  })

  await sandbox.runCommand({
    cmd: 'git',
    args: ['config', '--global', 'user.name', 'IFI'],
  })

  await sandbox.runCommand({
    cmd: 'git',
    args: ['config', '--global', 'user.email', 'ai@ifi.dev'],
  })

  const gitLs = await sandbox.runCommand({
    cmd: 'git',
    args: ['ls-remote', '--heads', 'https://github.com/octocat/Hello-World.git'],
  })

  const gitLsOutput = {
    stdout: await gitLs.stdout(),
    stderr: await gitLs.stderr(),
  }

  console.log(`[sandbox] git configured: ${gitLsOutput.stdout}`)
}

export async function trialExecute({ repo }: { repo: string }) {
  "use step"
  const sandbox = await initSandbox({ repo })
  await configureSandbox({ sandbox, continueConfig: CONTINUE_WORKER_CONFIG })
  return { sandboxId: sandbox.sandboxId }
}