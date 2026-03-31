import { h } from '../../utils/dom';
import { timeAgo, duration, shortSha } from '../../utils/format';
import type { WorkflowRun } from '../../types';

export function renderRunTimeline(runs: WorkflowRun[]): HTMLElement {
  const list = h('ul', { className: 'run-timeline' });

  for (const run of runs) {
    const status = run.conclusion || run.status;
    const li = h('li', { className: 'run-item' });
    li.innerHTML = `
      <span class="run-sha">${shortSha(run.head_sha)}</span>
      <span class="run-branch">${run.head_branch}</span>
      <span class="run-status ${status}">${status}</span>
      <span class="run-duration">${duration(run.created_at, run.updated_at)}</span>
      <span class="run-time">${timeAgo(run.created_at)}</span>
    `;
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => window.open(run.html_url, '_blank'));
    list.appendChild(li);
  }

  return list;
}
