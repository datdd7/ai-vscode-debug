import { h } from '../../utils/dom';
import { TEST_CATEGORIES, COVERAGE_MODULES, BETA_GATES, STABLE_GATES, OPERATIONS } from '../../config';
import { renderTestCounters } from './TestCounter';
import { renderCoverageBars } from './CoverageBar';
import { renderGateProgress } from './GateProgress';

function renderOperationMatrix(): HTMLElement {
  const grid = h('div', { className: 'op-matrix' });
  for (const op of OPERATIONS) {
    const cell = h('div', { className: `op-cell ${op.tested ? 'tested' : 'untested'}` });
    cell.innerHTML = `
      <span>${op.name}</span>
      <span class="op-suite">${op.suite}</span>
    `;
    grid.appendChild(cell);
  }
  return grid;
}

export function renderMetricsView(): HTMLElement {
  const container = h('div');

  // Test Counts
  const testTitle = h('div', { className: 'section-title', innerHTML: 'Test Inventory' });
  container.appendChild(testTitle);
  container.appendChild(renderTestCounters(TEST_CATEGORIES));

  // Coverage
  const covTitle = h('div', { className: 'section-title', innerHTML: 'Code Coverage vs Threshold' });
  container.appendChild(covTitle);
  const covCard = h('div', { className: 'card' });
  covCard.appendChild(renderCoverageBars(COVERAGE_MODULES));
  container.appendChild(covCard);

  // Gates
  const gateTitle = h('div', { className: 'section-title', innerHTML: 'Release Gate Progress' });
  container.appendChild(gateTitle);
  container.appendChild(renderGateProgress(BETA_GATES, STABLE_GATES));

  // Operations Matrix
  const opTitle = h('div', { className: 'section-title' });
  const testedCount = OPERATIONS.filter(o => o.tested).length;
  opTitle.innerHTML = `Operation Coverage (${testedCount}/${OPERATIONS.length})`;
  container.appendChild(opTitle);
  container.appendChild(renderOperationMatrix());

  return container;
}
