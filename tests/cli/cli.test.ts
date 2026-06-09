import test from 'node:test';
import assert from 'node:assert';
import { execSync } from 'child_process';
import * as path from 'path';

const CLI_PATH = path.resolve(__dirname, '..', '..', '..', 'bin', 'opk');
const FIXTURES_DIR = path.resolve(__dirname, '..', '..', '..', 'tests', 'fixtures');

function runCli(args: string[]): { stdout: string; stderr: string; status: number | null } {
  try {
    const stdout = execSync(`node ${CLI_PATH} ${args.join(' ')}`, { encoding: 'utf-8' });
    return { stdout, stderr: '', status: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout ? error.stdout.toString() : '',
      stderr: error.stderr ? error.stderr.toString() : '',
      status: error.status,
    };
  }
}

test('CLI Integration', async (t) => {
  await t.test('should exit with 0 when scanning a clean directory', () => {
    const targetDir = path.join(FIXTURES_DIR, 'scanner-config');
    const result = runCli(['scan', targetDir]);
    if (result.status !== 0) {
      console.log('CLEAN DIRECTORY DEBUG:', result);
    }
    assert.strictEqual(result.status, 0);
    assert.ok(result.stdout.includes('scanned') || result.stdout.includes('No findings'));
  });

  await t.test('should exit with 1 when findings are found', () => {
    const targetDir = path.join(FIXTURES_DIR, 'ai-credentials');
    const result = runCli(['scan', targetDir]);
    if (result.status !== 1) {
      console.log('FINDINGS DEBUG:', result);
    }
    assert.strictEqual(result.status, 1);
    assert.ok(result.stdout.includes('OPK-001'));
  });

  await t.test('should output JSON when --json flag is used', () => {
    const targetDir = path.join(FIXTURES_DIR, 'prompt-artifacts');
    const result = runCli(['scan', targetDir, '--json']);
    
    // Attempt to parse stdout as JSON
    const parsed = JSON.parse(result.stdout);
    assert.ok(Array.isArray(parsed.findings));
    assert.ok(parsed.findings.length > 0);
    assert.strictEqual(parsed.findings[0].ruleId, 'OPK-002');
  });

  await t.test('should exit with 2 when an invalid --min-severity is provided', () => {
    const result = runCli(['scan', '--min-severity', 'invalid_level']);
    assert.strictEqual(result.status, 2);
    assert.ok(result.stderr.includes('Invalid --min-severity value'));
  });

  await t.test('should exit with 2 when --min-severity is missing value', () => {
    const result = runCli(['scan', '--min-severity']);
    assert.strictEqual(result.status, 2);
    assert.ok(result.stderr.includes('requires a value'));
  });

  await t.test('should filter out warnings when --min-severity error is provided', () => {
    const targetDir = path.join(FIXTURES_DIR, 'prompt-artifacts');
    // prompt-artifacts only contains OPK-002 which is a warning.
    const result = runCli(['scan', targetDir, '--min-severity', 'error']);
    // Since only warnings exist, they are filtered out, so exit code should be 0.
    assert.strictEqual(result.status, 0);
  });
});
