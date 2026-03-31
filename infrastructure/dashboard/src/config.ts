import type { PipelineJob, CoverageModule } from './types';

export const GITHUB_OWNER = 'datdang-dev';
export const GITHUB_REPO = 'ai-vscode-debug';
export const GITHUB_API = 'https://api.github.com';
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const PIPELINE_JOBS: PipelineJob[] = [
  { id: 'lint',       name: 'Lint & Type Check',    needs: [] },
  { id: 'unit-tests', name: 'Unit Tests',            needs: [] },
  { id: 'mcp-tests',  name: 'MCP Tests',             needs: [] },
  { id: 'security',   name: 'Security Audit',        needs: [] },
  { id: 'build',      name: 'Build & Package VSIX',  needs: ['lint', 'unit-tests'] },
  { id: 'ci-gate',    name: 'CI Gate',               needs: ['lint', 'unit-tests', 'mcp-tests', 'build', 'security'] },
];

export const COVERAGE_MODULES: CoverageModule[] = [
  { name: 'validation.ts',   current: 100, threshold: 97 },
  { name: 'GDBBackend.ts',   current: 100, threshold: 97 },
  { name: 'router.ts',       current: 100, threshold: 97 },
  { name: 'MI2.ts',          current: 100, threshold: 97 },
  { name: 'mi_parse.ts',     current: 100, threshold: 97 },
  { name: 'errors.ts',       current: 100, threshold: 97 },
  { name: 'Overall',         current: 97,  threshold: 97 },
];
