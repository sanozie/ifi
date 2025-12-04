import { createDraftSpec, getThread } from '@db'
import { draftSpecFromMessages } from '@providers/mcp'

export async function reportCompletion() {
  "use step"
  return { acknowledged: true };
}

export async function draftSpec({ threadId, repo }: { threadId: string; repo: string }) {
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
}