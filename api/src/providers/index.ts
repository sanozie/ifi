import { tool } from 'ai'
import { webSearch } from '@exalabs/ai-sdk'
import { closeSandboxTool, initPlannerSandboxTool, initWorkerSandboxTool } from '@providers/sandbox'
import { cliQueryTool } from '@providers/continue'
import { draftSpecTool, finalizeSpecTool, reportCompletionTool, updateSpecTool, updateTitleTool } from '@providers/mcp'

export const plannerTools = {
  web_search: webSearch(),
  init_sandbox: initPlannerSandboxTool(tool) as any,
  close_sandbox: closeSandboxTool(tool) as any,
  cli_query: cliQueryTool(tool) as any,
  report_completion: reportCompletionTool(tool) as any,
  draft_spec: draftSpecTool(tool) as any,
  update_spec: updateSpecTool(tool) as any,
  finalize_spec: finalizeSpecTool(tool) as any,
  update_title: updateTitleTool(tool) as any,
}

export const workerTools = {
  init_sandbox: initWorkerSandboxTool(tool),
  // close_sandbox: closeSandboxTool(tool),
  // cli_query: cliQueryTool(tool),
  report_completion: reportCompletionTool(tool),
}