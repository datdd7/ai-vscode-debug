import { GITHUB_API, GITHUB_OWNER, GITHUB_REPO } from '../config';
import { getCached, setCache } from './cache';
import type { WorkflowRun, JobRun } from '../types';

const headers: Record<string, string> = {
  'Accept': 'application/vnd.github.v3+json',
};

async function ghFetch<T>(path: string, cacheKey: string): Promise<T> {
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  const url = `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}${path}`;
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`GitHub API ${resp.status}: ${resp.statusText}`);
  const data = await resp.json();
  setCache(cacheKey, data);
  return data;
}

export async function fetchWorkflowRuns(limit = 20): Promise<WorkflowRun[]> {
  const data = await ghFetch<{ workflow_runs: WorkflowRun[] }>(
    `/actions/runs?per_page=${limit}&status=completed`,
    `runs-${limit}`,
  );
  return data.workflow_runs || [];
}

export async function fetchJobsForRun(runId: number): Promise<JobRun[]> {
  const data = await ghFetch<{ jobs: JobRun[] }>(
    `/actions/runs/${runId}/jobs`,
    `jobs-${runId}`,
  );
  return (data.jobs || []).map(j => ({
    ...j,
    status: mapStatus(j.status, j.conclusion),
    steps: j.steps || [],
  }));
}

function mapStatus(status: string, conclusion: string | null): any {
  if (status === 'completed') {
    if (conclusion === 'success') return 'success';
    if (conclusion === 'failure') return 'failure';
    if (conclusion === 'skipped') return 'skipped';
    if (conclusion === 'cancelled') return 'cancelled';
    return 'failure';
  }
  if (status === 'in_progress') return 'in_progress';
  return 'queued';
}
