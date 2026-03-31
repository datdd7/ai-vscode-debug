import './style.css';
import { h } from './utils/dom';
import { fetchWorkflowRuns, fetchJobsForRun } from './api/github';
import { MOCK_RUNS } from './api/mock-data';
import { clearCache } from './api/cache';
import { renderPipelineView } from './components/pipeline/PipelineView';
import { renderMetricsView } from './components/metrics/MetricsView';
import { renderHistoryView } from './components/history/HistoryView';
import type { WorkflowRun } from './types';

type View = 'pipeline' | 'metrics' | 'history';

const TABS: { id: View; label: string }[] = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'metrics',  label: 'Metrics' },
  { id: 'history',  label: 'History' },
];

let currentView: View = 'pipeline';
let runs: WorkflowRun[] = [];
let useMock = false;

const app = document.getElementById('app')!;

function getViewFromHash(): View {
  const hash = location.hash.replace('#', '') as View;
  return TABS.find(t => t.id === hash)?.id || 'pipeline';
}

function renderNav(): HTMLElement {
  const nav = h('nav', { className: 'nav' });

  const brand = h('div', { className: 'nav-brand' });
  brand.innerHTML = 'AI Debug Proxy <span>CI Dashboard</span>';
  nav.appendChild(brand);

  for (const tab of TABS) {
    const btn = h('button', {
      className: `nav-tab${tab.id === currentView ? ' active' : ''}`,
    });
    btn.textContent = tab.label;
    btn.addEventListener('click', () => {
      currentView = tab.id;
      location.hash = tab.id;
      render();
    });
    nav.appendChild(btn);
  }

  const refresh = h('button', { className: 'nav-refresh' });
  refresh.textContent = 'Refresh';
  refresh.addEventListener('click', async () => {
    clearCache();
    await loadData();
    render();
  });
  nav.appendChild(refresh);

  // Mock toggle
  const mockBtn = h('button', { className: 'nav-refresh' });
  mockBtn.textContent = useMock ? 'Live' : 'Demo';
  mockBtn.title = useMock ? 'Switch to live GitHub API' : 'Switch to demo data';
  mockBtn.addEventListener('click', async () => {
    useMock = !useMock;
    await loadData();
    render();
  });
  nav.appendChild(mockBtn);

  return nav;
}

function renderContent(): HTMLElement {
  switch (currentView) {
    case 'pipeline': return renderPipelineView(runs);
    case 'metrics':  return renderMetricsView();
    case 'history':  return renderHistoryView(runs);
  }
}

function render() {
  app.innerHTML = '';
  app.appendChild(renderNav());
  app.appendChild(renderContent());
}

async function loadData() {
  if (useMock) {
    runs = MOCK_RUNS;
    return;
  }

  try {
    const rawRuns = await fetchWorkflowRuns(20);
    // Load jobs for latest 5 runs
    const withJobs = await Promise.all(
      rawRuns.slice(0, 5).map(async (run) => {
        try {
          const jobs = await fetchJobsForRun(run.id);
          return { ...run, jobs };
        } catch {
          return { ...run, jobs: [] };
        }
      })
    );
    runs = [
      ...withJobs,
      ...rawRuns.slice(5).map(r => ({ ...r, jobs: [] })),
    ];
  } catch (err) {
    console.warn('GitHub API failed, using mock data:', err);
    useMock = true;
    runs = MOCK_RUNS;
  }
}

// Boot
async function boot() {
  currentView = getViewFromHash();

  app.innerHTML = '<div class="loading">Loading CI data...</div>';

  await loadData();
  render();

  window.addEventListener('hashchange', () => {
    currentView = getViewFromHash();
    render();
  });
}

boot();
