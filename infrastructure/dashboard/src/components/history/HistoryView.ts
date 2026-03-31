import { h } from '../../utils/dom';
import { renderRunTimeline } from './RunTimeline';
import { renderTrendChart } from './TrendChart';
import type { WorkflowRun } from '../../types';

export function renderHistoryView(runs: WorkflowRun[]): HTMLElement {
  const container = h('div');

  const timelineTitle = h('div', { className: 'section-title', innerHTML: 'Recent Workflow Runs' });
  container.appendChild(timelineTitle);

  const card = h('div', { className: 'card' });
  card.appendChild(renderRunTimeline(runs));
  container.appendChild(card);

  const trendTitle = h('div', { className: 'section-title', innerHTML: 'Build Trend' });
  container.appendChild(trendTitle);
  container.appendChild(renderTrendChart(runs));

  return container;
}
