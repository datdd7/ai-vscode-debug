import { svgEl } from '../../utils/svg';
import type { JobRun, JobStatus } from '../../types';

const STATUS_COLORS: Record<string, { fill: string; stroke: string }> = {
  success:     { fill: 'rgba(255, 20, 147, 0.12)', stroke: '#FF1493' },
  failure:     { fill: 'rgba(255, 68, 68, 0.12)',   stroke: '#FF4444' },
  in_progress: { fill: 'rgba(255, 105, 180, 0.12)', stroke: '#FF69B4' },
  queued:      { fill: 'rgba(68, 68, 68, 0.12)',     stroke: '#444444' },
  skipped:     { fill: 'rgba(102, 102, 102, 0.08)',  stroke: '#666666' },
  cancelled:   { fill: 'rgba(102, 102, 102, 0.08)',  stroke: '#666666' },
};

const STATUS_ICONS: Record<string, string> = {
  success: '\u2713',     // checkmark
  failure: '\u2717',     // X
  in_progress: '\u25CF', // filled circle
  queued: '\u25CB',      // empty circle
  skipped: '\u2014',     // em dash
  cancelled: '\u2014',
};

export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 56;

export function renderJobNode(
  job: JobRun | null,
  pipelineId: string,
  x: number,
  y: number,
  onClick: (jobId: string) => void,
): SVGGElement {
  const status: JobStatus = job?.status as JobStatus || 'queued';
  const colors = STATUS_COLORS[status] || STATUS_COLORS.queued;
  const icon = STATUS_ICONS[status] || '';
  const label = job?.name || pipelineId;
  const dur = getDuration(job);

  const g = svgEl('g', { class: `job-node${status === 'in_progress' ? ' pulsing' : ''}` });
  g.style.cursor = 'pointer';

  const rect = svgEl('rect', {
    x, y, width: NODE_WIDTH, height: NODE_HEIGHT,
    fill: colors.fill, stroke: colors.stroke,
  });
  g.appendChild(rect);

  // Icon
  const iconText = svgEl('text', {
    x: x + 14, y: y + 34, class: 'job-icon',
    fill: colors.stroke, 'font-size': '16',
  });
  iconText.textContent = icon;
  g.appendChild(iconText);

  // Label (truncated)
  const labelText = svgEl('text', {
    x: x + 34, y: y + 28, class: 'job-label', 'font-size': '12',
  });
  labelText.textContent = truncate(label, 18);
  g.appendChild(labelText);

  // Duration
  const durText = svgEl('text', {
    x: x + 34, y: y + 44, class: 'job-duration', 'font-size': '10',
  });
  durText.textContent = dur;
  g.appendChild(durText);

  g.addEventListener('click', () => onClick(pipelineId));

  return g;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
}

function getDuration(job: JobRun | null): string {
  if (!job?.started_at || !job?.completed_at) return '';
  const ms = new Date(job.completed_at).getTime() - new Date(job.started_at).getTime();
  const s = Math.floor(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}
