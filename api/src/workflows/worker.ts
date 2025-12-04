import { getJob, getSpec, updateJob, updateSpec } from '@db'
import { JobStatus, SpecType } from '@interfaces'
import type { Spec, Job } from '@db/generated/client'
import { tool, type UIMessageChunk } from 'ai'
import { CONTINUE_WORKER_CONFIG, DefaultCodegenModel, modelConfig } from '@constants'
import { DurableAgent } from '@workflow/ai/agent'
import { getWritable } from 'workflow'
import { reportCompletionTool } from '@providers/mcp'
import { z } from 'zod'
import { initWorkerSandboxTool } from '@providers/sandbox'
import { Sandbox } from '@vercel/sandbox'
import ms from 'ms'

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

const workerTools = {
  init_sandbox: tool({
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
  }),
  // close_sandbox: closeSandboxTool(tool),
  // cli_query: cliQueryTool(tool),
  report_completion: tool({
    name: 'reportCompletion',
    description:
      'Call this exactly once when you have produced the final plan. The summary should be a concise, one-sentence description of what you accomplished.',
    inputSchema: z.object({
      summary: z.string(),
      code: z.number().optional(),
    }),
    async execute() {
      "use step"
      return { acknowledged: true };
    },
  })
}

// Helper to derive feature branch name
function deriveFeatureBranch(spec: Spec): string {
  return `feat/autogen-${spec.id.slice(0, 8)}`;
}

export async function handleJob({ jobId }: { jobId: string }) {
  "use workflow"

  const { job, spec } = await prepareJob({ jobId })

  const agent = await buildAgent({ job, spec })

  const writable = getWritable<UIMessageChunk>();

  // Create messages for the model
  const messages = [
    {
      role: 'user' as const,
      content: `
        ENVIRONMENT_CONTEXT:
        Spec Repository: ${spec.repo}
        Spec Type: ${spec.type}
        Spec Implementation Branch: ${spec.branch}
        
        SPEC CONTENT:
        ${spec.content}
        `
    }
  ];

  await agent.stream({
    messages,
    stopWhen: (response: any) => response.toolCalls?.some(
      (call: { toolName?: string }) => call.toolName === 'reportCompletion',
    ),
    writable
  })
}

async function prepareJob({ jobId }: { jobId: string }) {
  "use step"
  console.log(`[worker] Processing job ${jobId}`)

  let job = await getJob(jobId)

  if (!job) throw new Error(`Job ${jobId} not found`)

  let spec = await getSpec(job.spec_id)

  if (!spec) throw new Error(`Spec ${job.spec_id} not found for job ${job.id}`)

  // 3. Update status to apply and publish
  job = await updateJob(job.id, { status: JobStatus.APPLY })

  // Determine a feature branch - for UPDATE specs, use the branch
  const featureBranch = spec.type === SpecType.UPDATE && spec.branch
    ? spec.branch
    : deriveFeatureBranch(spec)

  spec = await updateSpec(spec.id, { branch: featureBranch })

  return { job, spec }
}

const buildAgent = async ({ job, spec }: { job: Job, spec: Spec}) => {
  console.log(`[executeWorkerModel] Starting job processing for ${job.id}`)
  // System message for worker operations
  const system = `
      You are a engineering worker AI that processes job requests to edit and apply code in the repositories you have access to, based off of a specification.
      You'll be given a full-featured implementation specification for the job, as well as environment context. Your task is to process the specification in a sandbox environment and apply the changes to the repository.
      
      The detailed workflow is as follows:
      1. Initialize a sandbox environment for the job. The environment will have an AI agent installed in the CLI that will respond to your subsequent queries. Your cli_query tool will be used as your primary interface to the sandbox environment, and you will instruct the AI agent to complete your goal.
      2. Check for the existence of the implementation branch on the github repository. If it doesn't exist, create it based off of main. Checkout the branch to prepare for implementation.
      3. Pass the specification to the apply tool, word for word, to generate and apply the changes.
         - Make sure to ask the cli tool to create and push the commit after the changes are made.
         - You are only allowed to call the apply tool once. Do not attempt to redo it.
      4. Finally, determine if this is a new feature or an update from the specification, and create a PR if it is initial specification, and not an update one.
      5. Report your completion of the task.
      
      Execute these steps in order and return the results. Be concise and focused on completing the workflow.`;

  console.log(`[executeWorkerModel] 🚀 Calling generateText with model "${DefaultCodegenModel}"`);

  return new DurableAgent({
    model: modelConfig.codegenModel,
    system,
    tools: workerTools,
  })
}




