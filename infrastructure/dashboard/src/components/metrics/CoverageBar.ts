import { h } from '../../utils/dom';
import type { CoverageModule } from '../../types';

export function renderCoverageBars(modules: CoverageModule[]): HTMLElement {
  const container = h('div', { className: 'coverage-list' });
  for (const mod of modules) {
    const pass = mod.current >= mod.threshold;
    const row = h('div', { className: 'coverage-row' });
    row.innerHTML = `
      <span class="coverage-label">${mod.name}</span>
      <div class="coverage-bar-bg">
        <div class="coverage-bar-fill ${pass ? 'pass' : 'fail'}" style="width: ${mod.current}%"></div>
        <div class="coverage-threshold" style="left: ${mod.threshold}%"></div>
      </div>
      <span class="coverage-pct ${pass ? 'pass' : 'fail'}">${mod.current}%</span>
    `;
    container.appendChild(row);
  }
  return container;
}
