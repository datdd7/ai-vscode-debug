import { h } from '../../utils/dom';
import { duration } from '../../utils/format';
import type { JobRun } from '../../types';

export function renderJobDetail(job: JobRun): HTMLElement {
  const panel = h('div', { className: 'job-detail' });

  const header = h('div', { className: 'job-detail-header' });
  const statusIcon = job.status === 'success' ? '\u2713' : '\u2717';
  const statusColor = job.status === 'success' ? 'var(--pink-hot)' : 'var(--status-failure)';
  header.innerHTML = `
    <span style="color: ${statusColor}; font-size: 16px;">${statusIcon}</span>
    <span class="job-detail-title">${job.name}</span>
    <a class="job-detail-link" href="${job.html_url}" target="_blank">View on GitHub &rarr;</a>
  `;
  panel.appendChild(header);

  const list = h('ul', { className: 'step-list' });
  for (const step of job.steps) {
    const icon = step.conclusion === 'success' ? '\u2713' : step.conclusion === 'failure' ? '\u2717' : '\u25CB';
    const color = step.conclusion === 'success' ? 'var(--pink-hot)'
      : step.conclusion === 'failure' ? 'var(--status-failure)' : 'var(--text-muted)';
    const dur = duration(step.started_at, step.completed_at);

    const li = h('li', { className: 'step-item' });
    li.innerHTML = `
      <span class="step-icon" style="color: ${color}">${icon}</span>
      <span class="step-name">${step.name}</span>
      <span class="step-dur">${dur}</span>
    `;
    list.appendChild(li);
  }
  panel.appendChild(list);

  return panel;
}
