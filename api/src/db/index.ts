import { PrismaClient } from './generated/client.js'
import { ThreadState, SpecType } from '@interfaces'
import { Client } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import type { UIMessage } from 'ai'

const client = new Client({ connectionString: process.env.DATABASE_URL })
client.connect()
const adapter = new PrismaNeon(client)
export const prisma = new PrismaClient({ adapter })

/* ------------------------------------------------------------------ */
/*  Threads                                                           */
/* ------------------------------------------------------------------ */

/**
 * Create a new thread
 * @returns The created thread
 * @param params
 */
export async function createThread(params: {
  title: string,
  chat: object,
  id?: string,
}) {
  return prisma.thread.create({
    data: {
      ...(params.id && { id: params.id }),
      title: params.title,
      chat: params.chat,
    }
  });
}

/**
 * Add a message to a thread
 * Accepts rich params to support token/cost tracking
 */
export async function saveThread(params: {
  threadId: string,
  streamId?: string
  chat?: UIMessage[]
}) {
  return prisma.thread.update({
    where: {
      id: params.threadId,
    },
    // @ts-ignore
    data: {
      ...(params.streamId && { stream_id: params.streamId }),
      ...(params.chat && { chat: params.chat })
    },
  });
}

/**
 * Get a thread by ID
 * @returns The spec
 * @param specId
 */
export async function getSpec(specId: string) {
  return prisma.spec.findUnique({
    where: {
      id: specId,
    }
  });
}


/**
 * Get a thread by ID
 * @param threadId Thread ID
 * @returns The thread
 */
export async function getThread(threadId: string) {
  return prisma.thread.findUnique({
    where: {
      id: threadId,
    }
  });
}

/**
 * Get all threads
 * @returns All threads
 */
export async function getThreads() {
  return prisma.thread.findMany({
    orderBy: {
      updated_at: 'desc',
    }
  });
}

/**
 * Update a thread's lifecycle state and (optionally) current PR info.
 * Passing null for branch/url will clear the fields.
 */
export async function updateThreadState(
  threadId: string,
  state: ThreadState,
) {
  return prisma.thread.update({
    where: { id: threadId },
    data: {
      state,
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Jobs                                                              */
/* ------------------------------------------------------------------ */

/**
 * Create a new job
 * @param params Job parameters
 * @returns The created job
 */
export async function createJob(params: {
  specId: string;
  status: string;
}) {
  return prisma.job.create({
    data: {
      spec_id: params.specId,
      status: params.status,
    },
  });
}

/**
 * Get a job by ID
 * @param jobId Job ID
 * @returns The job
 */
export async function getJob(jobId: string) {
  return prisma.job.findUnique({
    where: {
      id: jobId,
    },
  });
}

/**
 * Update a job
 * @param jobId Job ID
 * @param data Job data to update
 * @returns The updated job
 */
export async function updateJob(
  jobId: string,
  data: {
    status?: string;
    branch?: string;
    pr_url?: string;
    error?: string;
  }
) {
  return prisma.job.update({
    where: {
      id: jobId,
    },
    data,
  });
}

/* ------------------------------------------------------------------ */
/*  Specs                                                             */
/* ------------------------------------------------------------------ */

/**
 * Update a spec
 * @param specId Spec ID
 * @param data Job data to update
 * @returns The updated job
 */
export async function updateSpec(
  specId: string,
  data: {
    title?: string;
    branch?: string;
    content?: string;
    repo?: string;
  }
) {
  return prisma.spec.update({
    where: {
      id: specId,
    },
    data,
  });
}

export function getLatestDraftSpec(threadId: string) {
  return prisma.spec.findFirst({
    where: { thread_id: threadId },
    orderBy: { created_at: 'desc' },
  });
}

export async function createDraftSpec(
  threadId: string,
  draft: { title: string; content: string; repo: string },
) {
  return prisma.spec.create({
    data: {
      thread_id: threadId,
      title: draft.title,
      content: draft.content,
      repo: draft.repo,
      version: 1,
    },
  })
}

export async function updateDraftSpec(
  specId: string,
  draft: { title?: string; content?: string; repo?: string },
) {
  return prisma.spec.update({
    where: {id: specId},
    data: draft,
  })
}


/**
 * Create an UPDATE-type spec (version is latest +1)
 */
export async function createUpdateSpec(params: {
  title: string;
  content: string;
  branch: string;
  repo: string;
}) {

  return prisma.spec.create({
    data: {
      title: params.title,
      content: params.content,
      type: SpecType.UPDATE,
      branch: params.branch,
      repo: params.repo,
    },
  });
}
