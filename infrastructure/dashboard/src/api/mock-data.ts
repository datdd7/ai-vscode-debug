import type { WorkflowRun, JobRun } from '../types';

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60000).toISOString();
}

function makeJobs(conclusion: 'success' | 'failure', failJob?: string): JobRun[] {
  const jobs = [
    { id: 1, name: 'Lint & Type Check',                 needs: [] },
    { id: 2, name: 'Unit Tests (TypeScript/vitest)',     needs: [] },
    { id: 3, name: 'MCP Server Tests (Python/pytest)',   needs: [] },
    { id: 4, name: 'Build & Package VSIX',              needs: ['lint'] },
    { id: 5, name: 'Security Audit',                    needs: [] },
    { id: 6, name: 'CI Gate',                           needs: ['lint','unit-tests','mcp-tests','build','security'] },
    { id: 7, name: 'Deploy Dashboard',                  needs: ['ci-gate'] },
  ];

  return jobs.map((j, i) => ({
    id: j.id,
    name: j.name,
    status: (failJob && j.name.toLowerCase().includes(failJob)) ? 'failure' as const : 'success' as const,
    conclusion: (failJob && j.name.toLowerCase().includes(failJob)) ? 'failure' : 'success',
    started_at: ago(30 - i),
    completed_at: ago(28 - i),
    html_url: `https://github.com/datdang-dev/ai-vscode-debug/actions/runs/100/jobs/${j.id}`,
    steps: [
      { name: 'Set up job', status: 'completed', conclusion: 'success', number: 1, started_at: ago(30), completed_at: ago(29) },
      { name: 'Run actions/checkout@v4', status: 'completed', conclusion: 'success', number: 2, started_at: ago(29), completed_at: ago(28) },
      { name: 'Install dependencies', status: 'completed', conclusion: 'success', number: 3, started_at: ago(28), completed_at: ago(27) },
      { name: 'Run tests', status: 'completed', conclusion: (failJob && j.name.toLowerCase().includes(failJob)) ? 'failure' : 'success', number: 4, started_at: ago(27), completed_at: ago(26) },
      { name: 'Post actions/checkout@v4', status: 'completed', conclusion: 'success', number: 5, started_at: ago(26), completed_at: ago(25) },
    ],
  }));
}

export const MOCK_RUNS: WorkflowRun[] = [
  {
    id: 100, name: 'CI', head_branch: 'feature/v3-alpha-audit', head_sha: '139561fabcd1234567890abcdef',
    status: 'completed', conclusion: 'success', run_number: 5,
    html_url: 'https://github.com/datdang-dev/ai-vscode-debug/actions/runs/100',
    created_at: ago(35), updated_at: ago(20), jobs: makeJobs('success'),
  },
  {
    id: 99, name: 'CI', head_branch: 'feature/v3-alpha-audit', head_sha: '172e1f3abcd1234567890abcdef',
    status: 'completed', conclusion: 'failure', run_number: 4,
    html_url: 'https://github.com/datdang-dev/ai-vscode-debug/actions/runs/99',
    created_at: ago(120), updated_at: ago(100), jobs: makeJobs('failure', 'unit'),
  },
  {
    id: 98, name: 'CI', head_branch: 'feature/v3-alpha-audit', head_sha: '231c77cabcd1234567890abcdef',
    status: 'completed', conclusion: 'success', run_number: 3,
    html_url: 'https://github.com/datdang-dev/ai-vscode-debug/actions/runs/98',
    created_at: ago(300), updated_at: ago(280), jobs: makeJobs('success'),
  },
  {
    id: 97, name: 'CI', head_branch: 'master', head_sha: 'fa634f6abcd1234567890abcdef',
    status: 'completed', conclusion: 'success', run_number: 2,
    html_url: 'https://github.com/datdang-dev/ai-vscode-debug/actions/runs/97',
    created_at: ago(600), updated_at: ago(580), jobs: makeJobs('success'),
  },
  {
    id: 96, name: 'CI', head_branch: 'master', head_sha: 'b059acbabcd1234567890abcdef',
    status: 'completed', conclusion: 'failure', run_number: 1,
    html_url: 'https://github.com/datdang-dev/ai-vscode-debug/actions/runs/96',
    created_at: ago(900), updated_at: ago(880), jobs: makeJobs('failure', 'security'),
  },
];
