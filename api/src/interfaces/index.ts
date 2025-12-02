/**
 * Common types and constants used across services
 */

// Message role type
export type MessageRole = 'user' | 'assistant' | 'system';

// Chat request/response
export interface ChatRequest {
  threadId?: string;
  message: string;
  context?: {
    repo?: string;
    notionalWorkspaceId?: string;
  };
}

export interface ChatResponse {
  jobId?: string;
  reply?: string;
}
// Job status enum
export enum JobStatus {
  QUEUED = 'queued',
  PLANNING = 'planning',
  CODEGEN = 'codegen',
  APPLY = 'apply',
  TEST = 'test',
  PR_OPEN = 'pr_open',
  COMPLETE = 'complete',
  FAILED = 'failed',
}

// Structured Implementation Spec
export interface BranchPolicy {
  mode: 'new_branch' | 'existing';
  name?: string;
}

export interface ImplementationSpec {
  goal: string;
  repo: string;
  baseBranch: string;
  branchPolicy: BranchPolicy;
  featureName: string;
  deliverables: Array<
    | {
    type: 'code';
    paths?: string[];
    desc: string;
  }
    | {
    type: 'tests';
    framework: string;
    paths?: string[];
    desc: string;
  }
  >;
  constraints: string[];
  acceptanceCriteria: string[];
  riskNotes: string[];
  testPlan?: {
    strategy: 'unit' | 'integration' | 'e2e';
    commands: string[];
  };
  implementationHints?: string[];
  fileTargets: Array<{ path: string; reason: string }>;
  contextSnapshot?: {
    topFiles: Array<{ path: string; hash?: string; excerpt?: string }>;
    deps?: string[];
  };
  completenessScore: number;
}

// Planner intent surfaced to the client
export type Intent = 'ready_to_codegen' | 'needs_more_info';

/* ------------------------------------------------------------------ */
/*  Multi-spec / PR-feedback workflow additions                       */
/* ------------------------------------------------------------------ */

// Thread lifecycle state
export enum ThreadState {
  PLANNING = 'planning',
  WORKING = 'working',
  WAITING_FOR_FEEDBACK = 'waiting_for_feedback',
  ARCHIVED = 'archived',
}

// Spec variants
export enum SpecType {
  INITIAL = 'initial',
  UPDATE = 'update',
}

// Pull-request status (simplified view for the client)
export enum PRStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  MERGED = 'merged',
  CLOSED = 'closed',
}

// Useful branch metadata surfaced to the planner / continue CLI
export interface BranchInfo {
  branch: string;
  commit: string;
}

// Request payload when the assistant generates an UPDATE spec
export interface UpdateSpecRequest {
  threadId: string;
  previousSpecId: string;
  targetBranch: string;
  /**
   * High-level summary of what changed in the repo / PR since the last spec
   * (e.g. “Addressed reviewer comments in foo.ts, added unit tests”)
   */
  diffSummary: string;
  /**
   * Full markdown content of the updated spec
   */
  content: string;
}

// Event describing a thread state change (for logging / analytics)
export interface ThreadStateTransition {
  threadId: string;
  from: ThreadState;
  to: ThreadState;
  reason?: string;
}

/**
 * Provider configuration
 */
export interface ModelConfig {
  plannerModel: string;
  codegenModel: string;
}

export const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
export const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 } as const;
function levelValue(level: keyof typeof LEVELS): number { return LEVELS[level] || LEVELS.info; }
function enabled(level: keyof typeof LEVELS): boolean { return levelValue(level as any) >= levelValue(LOG_LEVEL as any); }

export function makeLogger(scope: string) {
  return {
    debug: (...args: any[]) => { if (enabled('debug')) console.log(`[${scope}] 🐛`, ...args); },
    info:  (...args: any[]) => { if (enabled('info'))  console.log(`[${scope}] ▶️`, ...args); },
    warn:  (...args: any[]) => { if (enabled('warn'))  console.warn(`[${scope}] ⚠️`, ...args); },
    error: (...args: any[]) => { if (enabled('error')) console.error(`[${scope}] 🛑`, ...args); },
  } as const;
}