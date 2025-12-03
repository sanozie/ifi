import { Context } from 'hono'
import { Webhooks } from '@octokit/webhooks'
import { createJob, createUpdateSpec } from '@db'
import { JobStatus } from '@interfaces'

// GitHub Webhooks setup
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const webhooks = GITHUB_WEBHOOK_SECRET
  ? new Webhooks({ secret: GITHUB_WEBHOOK_SECRET })
  : null;


export const github = async (c: Context) => {

  console.log(`[webhook] ▶️ Incoming GitHub webhook`)

  await verifyGithubSignature(c)

  const event = c.req.header('x-github-event') as string;
  const payload = await c.req.json();

  console.log(`[webhook] 📦 Event type: ${event}`);
  console.log(`[webhook] Event body: ${JSON.stringify(await c.req.json())}`)

  const { comment, issue, repository, action } = payload
  const { pull_request: pr } = issue || payload
  const number = pr.number || issue.number

  let branch = '', context = ''

  if (event === 'pull_request_review_comment' && action === 'created') {
    console.log(`[webhook] 💬 PR review comment on ${repository.full_name}#${pr.number}`);
    console.log(`[webhook] 👤 Comment by: ${comment.user.login}`);
    console.log(`[webhook] 📝 Comment body: ${comment.body}`);
    console.log(`[webhook] 📄 File: ${comment.path}, Line: ${comment.line || comment.original_line}`);

    branch = pr.head.ref

    const filePath = comment.path;
    const line = comment.line || comment.original_line; // line is for single-line, original_line for multi-line
    const startLine = comment.start_line || line;
    const diffHunk = comment.diff_hunk; // The diff context around the comment

    // Build detailed context for the spec
    context = `Comment by ${comment.user.login}`
    if (filePath && line) {
      context += `\n\n**Location:** \`${filePath}:${line}\``
      if (startLine !== line) {
        context += ` (lines ${startLine}-${line})`
      }
    }

    if (diffHunk) {
      context += `\n\n**Code Context:**\n\`\`\`diff\n${diffHunk}\n\`\`\``
    }

    context += `\n\n**Comment:**\n${comment.body}`;
  } else if (event === 'issue_comment' && payload.action === 'created') {
    // Check if this is a PR comment (issues and PRs both trigger issue_comment)
    if (!pr) {
      console.log('[webhook] ℹ️  Comment is not on a PR, ignoring')
    }

    branch = issue?.title?.match(/^\[(.*?)]/)[1]

    context = `Comment by ${comment.user.login} on PR #${issue.number}:\n\n${comment.body}`
  }

  // Create an UPDATE spec based on the comment with file/line context
  const spec = await createUpdateSpec({
    title: `Update for PR ${repository.name}#${pr.number}`,
    content: context,
    branch: branch,
    repo: repository.name,
  })

  // Create a job for the worker to pick up
  const job = await createJob({
    specId: spec.id,
    status: JobStatus.QUEUED,
  })

  console.log(`[webhook] 🎯 Created job: ${job.id}`)
}

const verifyGithubSignature = async (c: Context) => {
  try {
    // Verify signature if secret is configured
    if (webhooks && GITHUB_WEBHOOK_SECRET) {
      const signature = c.req.header('x-hub-signature-256') as string

      if (!signature) {
        console.error('[webhook] ❌ Missing signature')
      }

      try {
        await webhooks.verify(JSON.stringify(await c.req.json()), signature)
        console.log('[webhook] ✅ Signature verified');
      } catch (err) {
        console.error('[webhook] ❌ Invalid signature:', err)
      }
    } else {
      console.warn('[webhook] ⚠️  No webhook secret configured - skipping verification')
    }
  } catch (err) {
    console.error('[webhook] 🛑 Error verifying webhook signature:', err)
  }
}