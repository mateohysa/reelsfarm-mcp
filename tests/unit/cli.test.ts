import { describe, expect, it } from 'vitest';
import { buildProgram } from '../../cli/index.js';

describe('cli', () => {
  it('builds the top-level program', () => {
    const program = buildProgram();
    expect(program.name()).toBe('reelsfarm');
    expect(program.commands.map((command) => command.name())).toContain('avatars');
  });
});
