export type JobStatus = 'success' | 'failure' | 'in_progress' | 'queued' | 'skipped' | 'cancelled';

export interface PipelineJob {
  id: string;
  name: string;
  needs: string[];
}

export interface JobRun {
  id: number;
  name: string;
  status: JobStatus;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  html_url: string;
  steps: JobStep[];
}

export interface JobStep {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface WorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_number: number;
  jobs: JobRun[];
}

export interface CoverageModule {
  name: string;
  current: number;
  threshold: number;
}
