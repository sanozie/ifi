// AI & Workflows
import { generateText } from 'ai'
import { start } from 'workflow/api'
import { z } from 'zod'

// Packages
import {
  createDraftSpec,
  createJob,
  getLatestDraftSpec,
  getThread,
  updateDraftSpec,
  prisma
} from '@db'
import { JobStatus, type ModelConfig } from '@interfaces'
import { modelConfig } from '@constants'
import { handleJob } from '@workflows/worker'


export function reportCompletionTool(mcptool: any) {
  return mcptool({
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
  }) as any;
}

export function draftSpecTool(mcptool: any) {
  return mcptool({
    name: 'draftSpec',
    description:
      'Create a draft design spec for a given thread based on the conversation so far.',
    inputSchema: z.object({
      threadId: z.string().describe('ID of the thread for which to draft the spec'),
      repo: z.string().describe('Target repository for the spec, in all lowercase)'),
    }),
    async execute({ threadId, repo }: { threadId: string; repo: string }) {
      "use step"

      try {
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
      } catch (err: any) {
        return { error: true, message: `draftSpec failed: ${err.message}` }
      }
    },
  }) as any;
}

export function updateSpecTool(mcptool: any) {
  return mcptool({
    name: 'updateSpec',
    description:
      'Update a draft design spec for a given thread based on the conversation so far.',
    inputSchema: z.object({
      specId: z.string().describe('ID of the existing spec to update. If not provided, a new spec will be created.'),
      title: z.string().optional().describe('Title for the spec. If not provided, the title will be derived from the first line of the spec content.'),
      repo: z.string().optional().describe('Target repository for the spec, in all lowercase)'),
      content: z.string().optional().describe('Existing spec content to update. Will fully replace the existing spec content.')
    }),
    async execute({ specId, title, repo, content }: { specId: string; title?: string, repo?: string, content?: string }) {
      "use step"

      try {
        const spec = await updateDraftSpec(specId, { title, content, repo })
        return { specId: spec.id, content: spec.content, title: spec.title, repo: spec.repo }
      } catch (err: any) {
        return { error: true, message: `draftSpec failed: ${err.message}` }
      }
    },
  }) as any;
}


export function finalizeSpecTool(mcptool: any) {
  return mcptool({
    name: 'finalizeSpec',
    description:
      'Finalize the latest draft spec for a thread and create a queued implementation job.',
    inputSchema: z.object({
      threadId: z.string().describe('ID of the thread whose spec should be finalized'),
    }),
    async execute({ threadId }: { threadId: string }) {
      "use step"

      try {
        const spec = await getLatestDraftSpec(threadId);
        if (!spec) {
          return { error: true, message: 'No draft spec found to finalize' }
        }

        const job = await createJob({
          specId: spec.id,
          status: JobStatus.QUEUED,
        })

        const run = await start(handleJob, [{ jobId: job.id }])

        return { jobId: job.id, runId: run.runId };
      } catch (err: any) {
        return { error: true, message: `finalizeSpec failed: ${err.message}` };
      }
    },
  }) as any;
}

export function updateTitleTool(mcptool: any) {
  return mcptool({
    name: 'update_title',
    description:
      'Update the title of a conversation thread. Use this sparingly when the overall topic or goal changes significantly.',
    inputSchema: z.object({
      threadId: z.string().describe('ID of the thread to rename'),
      title: z.string().min(3).max(120).describe('A concise, human-friendly title that summarizes the thread'),
    }),
    async execute({ threadId, title }: { threadId: string; title: string }) {
      "use step"

      try {
        const trimmed = title.trim();
        if (!trimmed) {
          return { error: true, message: 'Title cannot be empty' };
        }
        const updated = await prisma.thread.update({
          where: { id: threadId },
          data: { title: trimmed },
          select: { id: true, title: true, updated_at: true },
        });
        return { id: updated.id, title: updated.title, updatedAt: updated.updated_at };
      } catch (err: any) {
        if (err?.code === 'P2025') {
          return { error: true, message: 'Thread not found' };
        }
        return { error: true, message: `update_title failed: ${err.message}` };
      }
    },
  }) as any;
}

/**
 * Build a Markdown design spec from a conversation transcript.
 */
export async function draftSpecFromMessages(
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
