import type { PipelineJob, CoverageModule, ReleaseGate, TestCategory, OperationEntry } from './types';

export const GITHUB_OWNER = 'datdang-dev';
export const GITHUB_REPO = 'ai-vscode-debug';
export const GITHUB_API = 'https://api.github.com';
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const PIPELINE_JOBS: PipelineJob[] = [
  { id: 'lint',       name: 'Lint & Type Check',                needs: [] },
  { id: 'unit-tests', name: 'Unit Tests (vitest)',              needs: [] },
  { id: 'mcp-tests',  name: 'MCP Tests (pytest)',               needs: [] },
  { id: 'security',   name: 'Security Audit',                   needs: [] },
  { id: 'build',      name: 'Build & Package VSIX',             needs: ['lint'] },
  { id: 'ci-gate',    name: 'CI Gate',                          needs: ['lint', 'unit-tests', 'mcp-tests', 'build', 'security'] },
  { id: 'dashboard',         name: 'Build Dashboard',           needs: ['ci-gate'] },
];

export const TEST_CATEGORIES: TestCategory[] = [
  { label: 'Unit (Vitest)',  count: 184, icon: '🧪' },
  { label: 'E2E (Mocha)',    count: 53,  icon: '🔗' },
  { label: 'MCP (pytest)',   count: 69,  icon: '🐍' },
  { label: 'Total',          count: 306, icon: '📊' },
];

export const COVERAGE_MODULES: CoverageModule[] = [
  { name: 'validation.ts',   current: 72, threshold: 90 },
  { name: 'GDBBackend.ts',   current: 65, threshold: 85 },
  { name: 'router.ts',       current: 68, threshold: 85 },
  { name: 'MI2.ts',          current: 60, threshold: 80 },
  { name: 'mi_parse.ts',     current: 58, threshold: 80 },
  { name: 'DebugAdapter.ts', current: 35, threshold: 60 },
  { name: 'Overall',         current: 55, threshold: 70 },
];

export const BETA_GATES: ReleaseGate[] = [
  { id: 'B1', name: 'Code Quality',        description: 'Lint zero errors, all tests pass, VSIX builds', passed: true },
  { id: 'B2', name: 'Op Coverage >= 80%',  description: '32/40 operations tested',                       passed: true },
  { id: 'B3', name: 'Error Path Coverage',  description: '>= 10 negative test cases',                    passed: true },
  { id: 'B4', name: 'Security Baseline',    description: '5 security tests pass, npm audit clean',       passed: true },
  { id: 'B5', name: 'Documentation',        description: 'API ref, changelog, release notes updated',    passed: false },
];

export const STABLE_GATES: ReleaseGate[] = [
  { id: 'S1', name: 'Code Coverage >= 70%',     description: 'Overall >= 70%, core modules >= 85%',  passed: false },
  { id: 'S2', name: 'Performance Benchmarks',    description: '6 latency/memory benchmarks pass',     passed: false },
  { id: 'S3', name: 'CI Pipeline GREEN',         description: 'All 6 CI jobs pass on PR to master',  passed: false },
  { id: 'S4', name: 'Documentation Complete',    description: 'TSDoc, diagrams, guides verified',     passed: false },
  { id: 'S5', name: 'Sign-Off',                  description: 'QA + Lead Architect approval',         passed: false },
];

export const OPERATIONS: OperationEntry[] = [
  { name: 'launch',                       tested: true,  suite: 'A' },
  { name: 'restart',                      tested: true,  suite: 'A' },
  { name: 'terminate',                    tested: true,  suite: 'A' },
  { name: 'continue',                     tested: true,  suite: 'B' },
  { name: 'next',                         tested: true,  suite: 'B' },
  { name: 'step_in',                      tested: true,  suite: 'C' },
  { name: 'step_out',                     tested: true,  suite: 'C' },
  { name: 'pause',                        tested: true,  suite: 'C' },
  { name: 'set_breakpoint',               tested: true,  suite: 'D' },
  { name: 'remove_breakpoint',            tested: true,  suite: 'D' },
  { name: 'set_temp_breakpoint',          tested: true,  suite: 'D' },
  { name: 'remove_all_breakpoints',       tested: true,  suite: 'D' },
  { name: 'get_active_breakpoints',       tested: true,  suite: 'D' },
  { name: 'set_breakpoint_condition',     tested: true,  suite: 'K' },
  { name: 'disable_breakpoint',           tested: true,  suite: 'K' },
  { name: 'enable_breakpoint',            tested: true,  suite: 'K' },
  { name: 'ignore_breakpoint',            tested: false, suite: '-' },
  { name: 'stack_trace',                  tested: true,  suite: 'E' },
  { name: 'up',                           tested: true,  suite: 'E' },
  { name: 'down',                         tested: true,  suite: 'E' },
  { name: 'goto_frame',                   tested: true,  suite: 'E' },
  { name: 'get_variables',                tested: true,  suite: 'F' },
  { name: 'get_arguments',               tested: true,  suite: 'K' },
  { name: 'get_globals',                  tested: false, suite: '-' },
  { name: 'list_all_locals',              tested: true,  suite: 'F' },
  { name: 'get_scope_preview',            tested: false, suite: '-' },
  { name: 'evaluate',                     tested: true,  suite: 'F' },
  { name: 'pretty_print',                tested: true,  suite: 'K' },
  { name: 'whatis',                       tested: true,  suite: 'F' },
  { name: 'execute_statement',            tested: true,  suite: 'K' },
  { name: 'list_source',                  tested: true,  suite: 'G' },
  { name: 'get_source',                   tested: true,  suite: 'G' },
  { name: 'get_last_stop_info',           tested: true,  suite: 'B' },
  { name: 'list_threads',                 tested: true,  suite: 'J' },
  { name: 'switch_thread',                tested: true,  suite: 'J' },
  { name: 'get_registers',                tested: true,  suite: 'I' },
  { name: 'read_memory',                  tested: true,  suite: 'I' },
  { name: 'write_memory',                 tested: true,  suite: 'I' },
  { name: 'attach',                       tested: false, suite: '-' },
  { name: 'start',                        tested: false, suite: '-' },
];
