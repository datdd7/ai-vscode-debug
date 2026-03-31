import { h } from '../../utils/dom';
import type { TestCategory } from '../../types';

export function renderTestCounters(categories: TestCategory[]): HTMLElement {
  const grid = h('div', { className: 'metrics-grid' });
  for (const cat of categories) {
    const card = h('div', { className: 'test-counter' });
    card.innerHTML = `
      <div class="icon">${cat.icon}</div>
      <div class="count">${cat.count}</div>
      <div class="label">${cat.label}</div>
    `;
    grid.appendChild(card);
  }
  return grid;
}
