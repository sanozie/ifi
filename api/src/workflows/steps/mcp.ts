import { createDraftSpec, createJob, getLatestDraftSpec, getThread, prisma, updateDraftSpec } from '@db'
import { JobStatus, type ModelConfig } from '@interfaces'
import { handleJob } from '@workflows/worker'
import { start } from 'workflow/api'
import { modelConfig } from '@constants'
import { generateText } from 'ai'

export async function reportCompletion() {
  "use step"
  return { acknowledged: true };
}

export async function draftSpec({ threadId, repo }: { threadId: string; repo: string }) {
  "use step"

  const thread = await getThread(threadId)

  if (!thread) {
    return { error: true, message: `Thread ${threadId} not found` }
  }

  const content = await draftSpecFromMessages(thread.chat)

  let title = 'Draft Spec';
  const firstLine = content.split('\n')[0] ?? ''
  if (firstLine.startsWith('#')) {
    title = firstLine.replace(/^#+\s*/, '').trim()
  } else if (thread.title) {
    title = `Draft Spec for ${thread.title}`
  }

  const spec = await createDraftSpec(threadId, { title, content, repo })
  return { specId: spec.id, content: spec.content, title: spec.title, repo: spec.repo }
}

export async function updateSpec({ specId, title, repo, content }: { specId: string; title?: string, repo?: string, content?: string }) {
  "use step"

  const spec = await updateDraftSpec(specId, { title, content, repo })
  return { specId: spec.id, content: spec.content, title: spec.title, repo: spec.repo }
}

export async function finalizeSpec({ threadId }: { threadId: string }) {
  "use step"

  const spec = await getLatestDraftSpec(threadId)

  if (!spec) {
    return { error: true, message: 'No draft spec found to finalize' }
  }

  const job = await createJob({
    specId: spec.id,
    status: JobStatus.QUEUED,
  })

  const run = await start(handleJob, [{ jobId: job.id }])

  return { job: job.id, run: run.runId };
}

export async function updateTitle({ threadId, title }: { threadId: string; title: string }) {
  "use step"

  const trimmed = title.trim();
  if (!trimmed) {
    return { error: true, message: 'Title cannot be empty' };
  }

  const updated = await prisma.thread.update({
    where: { id: threadId },
    data: { title: trimmed },
    select: { id: true, title: true, updated_at: true },
  })

  return { id: updated.id, title: updated.title, updatedAt: updated.updated_at }
}

/**
 * Build a Markdown design spec from a conversation transcript.
 */
async function draftSpecFromMessages(
  messages: any,
  config: Partial<ModelConfig> = {}
): Promise<string> {
  const mergedConfig = { ...modelConfig, ...config };

  const prompt = `You are a senior software engineer producing a concise internal design specification in Markdown format.
The following is the full planning conversation between the user and assistant delimited by triple backticks.
\`\`\`
${JSON.stringify(messages, null, 2).replace(/\\n/g, '\n')}
\`\`\`

Write a clear, well-structured design spec that includes a title, overview, requirements, proposed solution, next steps and acceptance criteria.
Respond ONLY with Markdown.`;

  console.log("[draftSpecFromMessages] prompt: ", prompt)
  const { text } = await generateText({
    model: mergedConfig.plannerModel,
    prompt,
    temperature: 0.3,
  });

  return text;
}