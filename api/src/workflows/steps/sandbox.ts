import { Sandbox } from '@vercel/sandbox'
import ms from 'ms'
import { CONTINUE_PLANNER_CONFIG, CONTINUE_WORKER_CONFIG } from '@constants'

const configureContinueCli = async ({ sandbox }: { sandbox: Sandbox }) => {
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
    content: Buffer.from(CONTINUE_WORKER_CONFIG)
  }])

  console.log(`[sandbox] continue config written @ .continue/.continue/config.yaml`)
}
export async function createWorkerSandbox({ repo }: { repo: string }) {
  "use step"
  
  console.log(`[sandbox] initializing sandbox for repo ${repo}`)
  // Create Sandbox
  const sandbox = await Sandbox.create({
    resources: { vcpus: 2 },
    timeout: ms('15m'),
    runtime: 'node22'
  })

  console.log(`[sandbox] sandbox initialized for repo ${repo}: ${sandbox.sandboxId}`)
  
  await configureContinueCli({ sandbox })

  // Git Operations
  const gitCredentialHelper = await sandbox.runCommand({
    cmd: 'git',
    args: ['config', '--global', 'credential.helper', 'store'],
  })

  await sandbox.runCommand({
    cmd: 'echo',
    args: [`https://x-access-token:${process.env.GITHUB_TOKEN}@github.com`, '>', './.git-credentials'],
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

  await sandbox.mkdir('tmp')
  await sandbox.runCommand({
    cmd: 'git',
    args: ['clone', 'https://github.com/sanozie/${repo}.git', 'tmp']
  })
  return { sandboxId: sandbox.sandboxId }
}

export async function createPlannerSandbox({ repo }: { repo: string }) {
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

  await configureContinueCli({ sandbox })

  return { sandboxId: sandbox.sandboxId }
}

export async function closeSandbox({ sandboxId }: { sandboxId: string }) {
  "use step"

  const sandbox = await Sandbox.get({ sandboxId })
  await sandbox.stop()
  return { sandboxId: sandbox.sandboxId, sandboxStatus: sandbox.status }
}