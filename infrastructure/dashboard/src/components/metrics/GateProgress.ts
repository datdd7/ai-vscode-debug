import { h } from '../../utils/dom';
import type { ReleaseGate } from '../../types';

function renderGateList(title: string, gates: ReleaseGate[]): HTMLElement {
  const section = h('div');
  const heading = h('div', { className: 'card-title', innerHTML: title });
  section.appendChild(heading);

  const list = h('ul', { className: 'gate-list' });
  for (const gate of gates) {
    const li = h('li', { className: 'gate-item' });
    li.innerHTML = `
      <div class="gate-check ${gate.passed ? 'pass' : 'fail'}">${gate.passed ? '\u2713' : ''}</div>
      <div>
        <div><span class="gate-id">${gate.id}</span> <span class="gate-name">${gate.name}</span></div>
        <div class="gate-desc">${gate.description}</div>
      </div>
    `;
    list.appendChild(li);
  }
  section.appendChild(list);
  return section;
}

export function renderGateProgress(betaGates: ReleaseGate[], stableGates: ReleaseGate[]): HTMLElement {
  const container = h('div', { className: 'gates-container' });
  container.appendChild(renderGateList('Beta Gates (B1-B5)', betaGates));
  container.appendChild(renderGateList('Stable Gates (S1-S5)', stableGates));
  return container;
}
