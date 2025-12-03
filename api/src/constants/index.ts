import type { ModelConfig } from '@interfaces'

export const CONTINUE_PLANNER_CONFIG = `
  name: Ifi
  version: 1.0.10
  schema: v1
  models:
    - name: GPT-5
      provider: openai
      model: openai/gpt-5.1-codex
      apiKey: ${process.env.AI_GATEWAY_API_KEY}
      apiBase: https://ai-gateway.vercel.sh/v1
      roles:
        - chat
  context:
    - uses: continuedev/terminal-context
    - uses: continuedev/file-context
  mcpServers:
    - uses: upstash/context7-mcp
`

export const CONTINUE_WORKER_CONFIG = `
  name: Ifi
  version: 1.0.10
  schema: v1
  models:
    - name: GPT-5
      provider: openai
      model: openai/gpt-5.1-codex
      apiKey: ${process.env.AI_GATEWAY_API_KEY}
      apiBase: https://ai-gateway.vercel.sh/v1
      roles:
        - chat
        - edit
        - apply
  context:
    - uses: continuedev/terminal-context
    - uses: continuedev/file-context
  mcpServers:
    - uses: upstash/context7-mcp
  prompts:
    - uses: continuedev/commit-message-prompt
`

export const REPOS = ['ifi-cloud', 'ifi-ui', 'nogent']

// Default AI model constants
export const DefaultPlannerModel = 'anthropic/claude-haiku-4.5'
export const DefaultCodegenModel = 'anthropic/claude-sonnet-4.5'
export const modelConfig: ModelConfig = {
  plannerModel: process.env.PLANNER_MODEL || DefaultPlannerModel,
  codegenModel: process.env.CODEGEN_MODEL || DefaultCodegenModel,
}