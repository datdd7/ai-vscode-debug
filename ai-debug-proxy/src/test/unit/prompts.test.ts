/**
 * Prompts Module Unit Tests
 * REQ-AGENT-001
 */
import { describe, it, expect } from 'vitest';
import { subagentCreatorPrompt } from '../../agent/prompts';

describe('subagentCreatorPrompt', () => {
    it('REQ-AGENT-001: exports a non-empty string prompt', () => {
        expect(typeof subagentCreatorPrompt).toBe('string');
        expect(subagentCreatorPrompt.length).toBeGreaterThan(100);
    });

    it('contains required YAML frontmatter header', () => {
        expect(subagentCreatorPrompt).toContain('name:');
        expect(subagentCreatorPrompt).toContain('description:');
    });
});
