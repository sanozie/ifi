import { getJob, getSpec, updateJob, updateSpec } from '@db'
import { JobStatus, SpecType } from '@interfaces'
import { Spec, Job } from '@db/generated/client'


// Helper to derive feature branch name
function deriveFeatureBranch(spec: Spec): string {
  return `feat/autogen-${spec.id.slice(0, 8)}`;
}

export async function handleJob( jobId: string) {
  "use workflow"
  const { job, spec } = await prepareJob({ jobId })
  // await executeJob({ spec, job })
  return { success: true, message: `Job ${jobId} processed successfully` }
}

async function prepareJob({ jobId }: { jobId: string }) {
  "use step"
  console.log(`[worker] Processing job ${jobId}`)
  try {
    let job = await getJob(jobId)
    console.log(`[worker] Job ${jobId} fetched successfully`)
  } catch (error: any) {
    console.error(`[worker] Error fetching job ${jobId}: ${error.message}`)
    return { job: null, spec: null }
  }

  //
  // if (!job) throw new Error(`Job ${jobId} not found`)
  //
  // let spec = await getSpec(job.spec_id)
  //
  // if (!spec) throw new Error(`Spec ${job.spec_id} not found for job ${job.id}`)
  //
  // // 3. Update status to apply and publish
  // job = await updateJob(job.id, { status: JobStatus.APPLY })
  //
  // // Determine a feature branch - for UPDATE specs, use the branch
  // const featureBranch = spec.type === SpecType.UPDATE && spec.branch
  //   ? spec.branch
  //   : deriveFeatureBranch(spec)
  //
  // spec = await updateSpec(spec.id, { branch: featureBranch })

  return { job: null, spec: null }
}

/**
 * Central model function that orchestrates worker tools for job processing
 */
async function executeJob({ spec, job }: { spec: Spec, job: Job }) {
  "use step"
  try {
    console.log(`[executeWorkerModel] Starting job processing for ${job.id}`)
  } catch (error: any) {
    console.error(`[executeWorkerModel] Error processing job ${job.id}: ${error.message}`)
    return {
      success: false,
      error: error.message
    }
  }
}



