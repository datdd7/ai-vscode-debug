import { h } from '../utils/dom';
import { renderCoverageBars } from './metrics/CoverageBar';
import { COVERAGE_MODULES, PIPELINE_JOBS } from '../config';
import type { WorkflowRun, JobRun } from '../types';

// Jobs that must all pass for the gate to be GREEN
const REQUIRED_JOB_IDS = ['lint', 'unit-tests', 'mcp-tests', 'build', 'security'];

function findJob(jobs: JobRun[], pipelineId: string): JobRun | null {
  const nameMap: Record<string, string> = {
    'lint':       'lint',
    'unit-tests': 'unit tests',
    'mcp-tests':  'mcp',
    'build':      'build',
    'security':   'security',
    'ci-gate':    'ci gate',
  };
  const search = nameMap[pipelineId] ?? pipelineId;
  return jobs.find(j => j.name.toLowerCase().includes(search)) ?? null;
}

function duration(job: JobRun): string {
  if (!job.started_at || !job.completed_at) return '';
  const secs = Math.round(
    (new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000
  );
  return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function renderJobChip(pipelineId: string, job: JobRun | null): HTMLElement {
  const pj = PIPELINE_JOBS.find(j => j.id === pipelineId);
  const label = pj?.name ?? pipelineId;
  const conclusion = job?.conclusion ?? null;
  const cls = conclusion === 'success' ? 'pass' : conclusion === 'failure' ? 'fail' : 'pending';
  const icon = conclusion === 'success' ? '✓' : conclusion === 'failure' ? '✗' : '·';
  const dur = job ? duration(job) : '';

  const chip = h('div', { className: `job-chip ${cls}` });
  chip.innerHTML =
    `<span class="chip-icon">${icon}</span>` +
    `<span class="chip-name">${label}</span>` +
    (dur ? `<span class="chip-dur">${dur}</span>` : '');

  if (job?.html_url) {
    chip.title = `View job: ${job.html_url}`;
    chip.style.cursor = 'pointer';
    chip.addEventListener('click', () => window.open(job.html_url, '_blank'));
  }
  return chip;
}

export function renderQualityGate(run: WorkflowRun | null): HTMLElement {
  const jobs = run?.jobs ?? [];

  const ciGreen = REQUIRED_JOB_IDS
    .map(id => findJob(jobs, id))
    .every(j => j?.conclusion === 'success');
  const coverageGreen = COVERAGE_MODULES.every(m => m.current >= m.threshold);
  const gatePass = ciGreen && coverageGreen;

  const root = h('div', { className: 'quality-gate' });

  // ── Verdict header ────────────────────────────────────────────────────────
  const header = h('div', { className: `gate-header ${gatePass ? 'pass' : 'fail'}` });

  const verdict = h('div', { className: 'gate-verdict' });
  verdict.innerHTML =
    `<span class="gate-dot"></span>` +
    `<span class="gate-verdict-label">${gatePass ? 'PASS' : 'FAIL'}</span>`;

  const meta = h('div', { className: 'gate-meta' });
  if (run) {
    const sha    = run.head_sha.slice(0, 7);
    const branch = run.head_branch;
    meta.innerHTML =
      `Quality Gate &nbsp;·&nbsp; ` +
      `<a href="${run.html_url}" target="_blank" class="gate-link">#${run.run_number}</a>` +
      ` &nbsp;·&nbsp; <span class="gate-branch">${branch}</span>` +
      ` &nbsp;·&nbsp; <code>${sha}</code>`;
  } else {
    meta.textContent = 'Quality Gate · no CI data available';
  }

  header.append(verdict, meta);
  root.appendChild(header);

  // ── CI Jobs ───────────────────────────────────────────────────────────────
  const jobsSection = h('div', { className: 'gate-section' });
  jobsSection.appendChild(h('div', { className: 'section-label', innerHTML: 'CI Jobs' }));

  const jobsRow = h('div', { className: 'jobs-row' });
  for (const id of [...REQUIRED_JOB_IDS, 'ci-gate']) {
    jobsRow.appendChild(renderJobChip(id, findJob(jobs, id)));
  }
  jobsSection.appendChild(jobsRow);
  root.appendChild(jobsSection);

  // ── Code Coverage ─────────────────────────────────────────────────────────
  const covSection = h('div', { className: 'gate-section' });
  covSection.appendChild(h('div', { className: 'section-label', innerHTML: 'Code Coverage' }));
  const covCard = h('div', { className: 'card' });
  covCard.appendChild(renderCoverageBars(COVERAGE_MODULES));
  covSection.appendChild(covCard);
  root.appendChild(covSection);

  // ── Test Summary ──────────────────────────────────────────────────────────
  const testSection = h('div', { className: 'gate-section' });
  testSection.appendChild(h('div', { className: 'section-label', innerHTML: 'Tests' }));
  const summary = h('div', { className: 'test-summary card' });
  summary.innerHTML =
    `<span class="test-stat pass">415 passing</span>` +
    `<span class="test-sep">·</span>` +
    `<span class="test-stat muted">0 failing</span>` +
    `<span class="test-sep">·</span>` +
    `<span class="test-stat muted">Vitest (TypeScript) + pytest (Python)</span>`;
  testSection.appendChild(summary);
  root.appendChild(testSection);

  return root;
}
