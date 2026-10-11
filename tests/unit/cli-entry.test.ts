import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isCliEntryPoint } from '../../cli/index.js';

const tempDirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'reelsfarm cli-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('CLI entry point', () => {
  it('matches the module when Node starts it directly or through a symlink', () => {
    const dir = tempDir();
    const script = join(dir, 'index.js');
    writeFileSync(script, '');
    const link = join(dir, 'reelsfarm');
    symlinkSync(script, link);
    const moduleUrl = pathToFileURL(script).href;

    expect(isCliEntryPoint(script, moduleUrl)).toBe(true);
    // npm runs bins through node_modules/.bin symlinks; the directory name also contains a space.
    expect(isCliEntryPoint(link, moduleUrl)).toBe(true);
  });

  it('does not match another script, a missing path, or no path', () => {
    const dir = tempDir();
    const script = join(dir, 'index.js');
    const other = join(dir, 'other.js');
    writeFileSync(script, '');
    writeFileSync(other, '');
    const moduleUrl = pathToFileURL(script).href;

    expect(isCliEntryPoint(other, moduleUrl)).toBe(false);
    expect(isCliEntryPoint(join(dir, 'missing.js'), moduleUrl)).toBe(false);
    expect(isCliEntryPoint(undefined, moduleUrl)).toBe(false);
  });

  it('runs commands when started through a bin symlink', () => {
    const dir = tempDir();
    const link = join(dir, 'reelsfarm');
    symlinkSync(resolve('cli/index.ts'), link);

    const output = execFileSync(process.execPath, ['--import', 'tsx', link, 'posts', 'update', '--help'], {
      encoding: 'utf8',
    });

    expect(output).toContain('Usage: reelsfarm posts update');
    expect(output).toContain('--platforms-json');
  });
});
