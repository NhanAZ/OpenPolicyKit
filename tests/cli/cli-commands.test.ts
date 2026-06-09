import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const CLI_PATH = path.resolve(__dirname, '..', '..', '..', 'bin', 'opk');
const PACKAGE_JSON_PATH = path.resolve(__dirname, '..', '..', '..', 'package.json');
const MISSING_SCAN_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'tests',
  'fixtures',
  'missing-scan-path',
);

interface CliResult {
  stdout: string;
  stderr: string;
  status: number | null;
}

interface PackageJson {
  version: string;
}

function runCli(args: string[]): CliResult {
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: 'utf8',
  });

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
  };
}

function getPackageVersion(): string {
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8')) as PackageJson;
  return packageJson.version;
}

test('CLI commands', async (t) => {
  await t.test('should print help and exit with 0 when no command is provided', () => {
    const result = runCli([]);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /OpenPolicyKit v\d+\.\d+\.\d+/);
    assert.match(result.stdout, /Usage:/);
    assert.match(result.stdout, /opk scan \[path\]/);
    assert.strictEqual(result.stderr, '');
  });

  await t.test('should print scan help and exit with 0', () => {
    const result = runCli(['scan', '--help']);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Scan options:/);
    assert.match(result.stdout, /--json/);
    assert.match(result.stdout, /--min-severity <level>/);
    assert.strictEqual(result.stderr, '');
  });

  await t.test('should print the package version and exit with 0', () => {
    const result = runCli(['--version']);

    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout.trim(), getPackageVersion());
    assert.strictEqual(result.stderr, '');
  });

  await t.test('should exit with 2 for an unknown command', () => {
    const result = runCli(['unknown']);

    assert.strictEqual(result.status, 2);
    assert.strictEqual(result.stdout, '');
    assert.match(result.stderr, /Unknown command: unknown/);
    assert.match(result.stderr, /Run "opk --help" for usage information\./);
  });

  await t.test('should exit with 2 when the scan path does not exist', () => {
    const result = runCli(['scan', MISSING_SCAN_PATH]);

    assert.strictEqual(result.status, 2);
    assert.strictEqual(result.stdout, '');
    assert.match(result.stderr, /Scan path does not exist or cannot be accessed:/);
    assert.match(result.stderr, /missing-scan-path/);
  });

  await t.test('should exit with 2 when the scan path is not a directory', () => {
    const result = runCli(['scan', PACKAGE_JSON_PATH]);

    assert.strictEqual(result.status, 2);
    assert.strictEqual(result.stdout, '');
    assert.match(result.stderr, /Scan path is not a directory:/);
    assert.match(result.stderr, /package\.json/);
  });
});
