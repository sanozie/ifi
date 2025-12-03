import { Sandbox } from '@vercel/sandbox'
import ms from 'ms'
import { z } from 'zod'
import { CONTINUE_PLANNER_CONFIG, CONTINUE_WORKER_CONFIG } from '@constants'

const initSandbox = async ({ repo }: { repo: string }) => {
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
}

export const initPlannerSandboxTool = (mcptool: any) => {
  return mcptool({
    name: 'initSandbox',
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
    async execute({ repo }: { repo: string }) {
      "use step"
      const sandbox = await initSandbox({ repo })
      await configureSandbox({ sandbox, continueConfig: CONTINUE_PLANNER_CONFIG })
      return { sandboxId: sandbox.sandboxId }
    },
  }) as any
}

export const initWorkerSandboxTool = (mcptool: any) => {
  return mcptool({
    name: 'initSandbox',
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
    async execute({ repo }: { repo: string }) {
      "use step"
      const sandbox = await initSandbox({ repo })
      await configureSandbox({ sandbox, continueConfig: CONTINUE_WORKER_CONFIG })
      return { sandboxId: sandbox.sandboxId }
    },
  }) as any
}

export const closeSandboxTool = (mcptool: any) => {
  return mcptool({
    name: 'closeSandbox',
    description:
      'Closes the Sandbox instance associated with the given sandboxId. This must be called when the tool is done with the Sandbox instance, before reporting completion',
    inputSchema: z.object({
      sandboxId: z.string().describe('ID of the Sandbox instance to close.'),
    }),
    async execute({ sandboxId }: { sandboxId: string }) {
      "use step"
      const sandbox = await Sandbox.get({ sandboxId })
      await sandbox.stop()
    }
  })
}