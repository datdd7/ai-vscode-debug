import './style.css';
import { fetchWorkflowRuns, fetchJobsForRun } from './api/github';
import { MOCK_RUNS } from './api/mock-data';
import { renderQualityGate } from './components/QualityGateView';
import type { WorkflowRun } from './types';

const app = document.getElementById('app')!;

async function loadLatestRun(): Promise<WorkflowRun | null> {
  try {
    const runs = await fetchWorkflowRuns(1);
    if (!runs.length) return null;
    const run = runs[0];
    try {
      const jobs = await fetchJobsForRun(run.id);
      return { ...run, jobs };
    } catch {
      return { ...run, jobs: [] };
    }
  } catch (err) {
    console.warn('GitHub API failed, using mock data:', err);
    const run = MOCK_RUNS[0] ?? null;
    return run;
  }
}

async function boot() {
  app.innerHTML = '<div class="loading">Loading CI data...</div>';
  const run = await loadLatestRun();
  app.innerHTML = '';
  app.appendChild(renderQualityGate(run));
}

boot();
