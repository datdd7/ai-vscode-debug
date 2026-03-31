import { svgEl } from '../../utils/svg';
import type { WorkflowRun } from '../../types';

export function renderTrendChart(runs: WorkflowRun[]): HTMLElement {
  const container = document.createElement('div');
  container.className = 'trend-chart-container';

  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = 'Pass / Fail Trend';
  container.appendChild(title);

  const reversed = [...runs].reverse(); // oldest first
  const count = reversed.length;
  if (count === 0) {
    container.innerHTML += '<div class="loading" style="padding: 20px;">No data</div>';
    return container;
  }

  const svgWidth = 700;
  const svgHeight = 140;
  const barWidth = Math.min(40, (svgWidth - 40) / count - 4);
  const gap = 4;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${svgWidth} ${svgHeight}`,
    preserveAspectRatio: 'xMidYMid meet',
  });

  // Baseline
  const baseline = svgEl('line', {
    x1: 20, y1: svgHeight - 20,
    x2: svgWidth - 20, y2: svgHeight - 20,
    stroke: '#2a2a2a', 'stroke-width': 1,
  });
  svg.appendChild(baseline);

  reversed.forEach((run, i) => {
    const x = 30 + i * (barWidth + gap);
    const isPass = run.conclusion === 'success';
    const barHeight = isPass ? 80 : 80;
    const y = svgHeight - 20 - barHeight;

    const rect = svgEl('rect', {
      x, y, width: barWidth, height: barHeight,
      rx: 3, ry: 3,
      fill: isPass ? 'rgba(255, 20, 147, 0.6)' : 'rgba(255, 68, 68, 0.5)',
      stroke: isPass ? '#FF1493' : '#FF4444',
      'stroke-width': 1,
    });

    // Tooltip title
    const titleEl = svgEl('title');
    titleEl.textContent = `#${run.run_number} — ${run.conclusion} (${run.head_branch})`;
    rect.appendChild(titleEl);

    svg.appendChild(rect);

    // Run number label
    const label = svgEl('text', {
      x: x + barWidth / 2,
      y: svgHeight - 6,
      'text-anchor': 'middle',
      'font-size': '9',
      fill: '#666',
      'font-family': "'JetBrains Mono', monospace",
    });
    label.textContent = `#${run.run_number}`;
    svg.appendChild(label);

    // Status icon on bar
    const icon = svgEl('text', {
      x: x + barWidth / 2,
      y: y + barHeight / 2 + 5,
      'text-anchor': 'middle',
      'font-size': '14',
      fill: isPass ? '#FF1493' : '#FF4444',
    });
    icon.textContent = isPass ? '\u2713' : '\u2717';
    svg.appendChild(icon);
  });

  container.appendChild(svg as unknown as Node);
  return container;
}
