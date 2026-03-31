import { h } from '../../utils/dom';
import { svgEl, bezierPath } from '../../utils/svg';
import { PIPELINE_JOBS } from '../../config';
import { renderJobNode, NODE_WIDTH, NODE_HEIGHT } from './JobNode';
import { renderJobDetail } from './JobDetail';
import type { WorkflowRun, JobRun } from '../../types';

// Layout: 5 columns
// Col 0: lint, unit-tests, mcp-tests, security (parallel)
// Col 1: build (needs lint)
// Col 2: ci-gate (needs all)
// Col 3: dashboard / build (needs ci-gate)
// Col 4: dashboard-deploy (needs dashboard, push-only)
const COL_X = [10, 210, 410, 600, 790];
const ROW_GAP = 70;
const START_Y = 30;

interface JobPos { x: number; y: number; id: string; }

function layoutJobs(): JobPos[] {
  const positions: JobPos[] = [];
  const col0 = PIPELINE_JOBS.filter(j => j.needs.length === 0);
  const col1 = PIPELINE_JOBS.filter(j => j.needs.length > 0 && j.id !== 'ci-gate' && j.id !== 'dashboard' && j.id !== 'dashboard-deploy');
  const col2 = PIPELINE_JOBS.filter(j => j.id === 'ci-gate');
  const col3 = PIPELINE_JOBS.filter(j => j.id === 'dashboard');
  const col4 = PIPELINE_JOBS.filter(j => j.id === 'dashboard-deploy');

  col0.forEach((j, i) => positions.push({ id: j.id, x: COL_X[0], y: START_Y + i * ROW_GAP }));
  col1.forEach((j, i) => positions.push({ id: j.id, x: COL_X[1], y: START_Y + 35 + i * ROW_GAP }));
  col2.forEach((j, i) => positions.push({ id: j.id, x: COL_X[2], y: START_Y + 100 + i * ROW_GAP }));
  col3.forEach((j, i) => positions.push({ id: j.id, x: COL_X[3], y: START_Y + 100 + i * ROW_GAP }));
  col4.forEach((j, i) => positions.push({ id: j.id, x: COL_X[4], y: START_Y + 100 + i * ROW_GAP }));

  return positions;
}

function findJobRun(jobs: JobRun[], pipelineId: string): JobRun | null {
  const nameMap: Record<string, string> = {
    'lint': 'lint',
    'unit-tests': 'unit tests',
    'mcp-tests': 'mcp',
    'build': 'build',
    'security': 'security',
    'ci-gate': 'ci gate',
    'dashboard': 'build dashboard',
    'dashboard-deploy': 'deploy to github',
  };
  const search = nameMap[pipelineId] || pipelineId;
  return jobs.find(j => j.name.toLowerCase().includes(search)) || null;
}

export function renderPipelineView(runs: WorkflowRun[]): HTMLElement {
  const container = h('div', { className: 'pipeline-container' });
  const positions = layoutJobs();
  let selectedRun = runs[0] || null;
  let detailContainer: HTMLElement | null = null;

  // Run selector
  const selector = h('div', { className: 'pipeline-run-selector' });
  const label = h('span', { className: 'card-title', innerHTML: 'Workflow Run' });
  const select = document.createElement('select');
  for (const run of runs) {
    const opt = document.createElement('option');
    opt.value = String(run.id);
    const icon = run.conclusion === 'success' ? '\u2713' : '\u2717';
    opt.textContent = `${icon} #${run.run_number} — ${run.head_branch} (${run.head_sha.slice(0, 7)})`;
    select.appendChild(opt);
  }
  select.addEventListener('change', () => {
    selectedRun = runs.find(r => String(r.id) === select.value) || runs[0];
    renderSvg();
  });
  selector.append(label, select);
  container.appendChild(selector);

  const svgContainer = h('div');
  container.appendChild(svgContainer);

  detailContainer = h('div');
  container.appendChild(detailContainer);

  function renderSvg() {
    const jobs = selectedRun?.jobs || [];
    const svg = svgEl('svg', {
      viewBox: '0 0 1000 340',
      class: 'pipeline-svg',
      preserveAspectRatio: 'xMidYMid meet',
    }) as unknown as SVGSVGElement;

    // Draw dependency arrows first
    const arrowGroup = svgEl('g');
    for (const pj of PIPELINE_JOBS) {
      if (pj.needs.length === 0) continue;
      const toPos = positions.find(p => p.id === pj.id)!;
      for (const dep of pj.needs) {
        const fromPos = positions.find(p => p.id === dep);
        if (!fromPos) continue;
        const fromJob = findJobRun(jobs, dep);
        const path = svgEl('path', {
          d: bezierPath(
            fromPos.x + NODE_WIDTH, fromPos.y + NODE_HEIGHT / 2,
            toPos.x, toPos.y + NODE_HEIGHT / 2,
          ),
          class: `dependency-arrow${fromJob?.status === 'success' ? ' success' : ''}`,
        });
        arrowGroup.appendChild(path);
      }
    }
    svg.appendChild(arrowGroup);

    // Draw job nodes
    for (const pos of positions) {
      const jobRun = findJobRun(jobs, pos.id);
      const node = renderJobNode(jobRun, pos.id, pos.x, pos.y, (jobId) => {
        const jr = findJobRun(jobs, jobId);
        detailContainer!.innerHTML = '';
        if (jr) detailContainer!.appendChild(renderJobDetail(jr));
      });
      svg.appendChild(node);
    }

    svgContainer.innerHTML = '';
    svgContainer.appendChild(svg as unknown as Node);
  }

  renderSvg();
  return container;
}
