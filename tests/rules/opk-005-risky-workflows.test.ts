import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as path from 'path';
import rule from '../../src/rules/opk-005-risky-workflows';
import { ScanContext } from '../../src/types';

const fixturesDir = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'tests',
  'fixtures',
  'ci-workflows',
);

function makeContext(files: string[]): ScanContext {
  return {
    rootDir: fixturesDir,
    files,
  };
}

describe('OPK-005: Risky CI/CD Workflows', () => {
  it('should detect high-risk GitHub Actions workflow patterns', async () => {
    const workflowPath = '.github/workflows/risky.yml';
    const findings = await rule.check(makeContext([workflowPath]));
    const lines = findings.map((finding) => finding.line);
    const messages = findings.map((finding) => finding.message);

    assert.strictEqual(findings.length, 4);
    assert.deepStrictEqual(lines, [3, 4, 9, 11]);
    assert.ok(messages.some((message) => message.includes('pull_request_target')));
    assert.ok(messages.some((message) => message.includes('write-all')));
    assert.ok(messages.some((message) => message.includes('floating ref')));
    assert.ok(messages.some((message) => message.includes('shell')));
    assert.ok(findings.every((finding) => finding.ruleId === 'OPK-005'));
    assert.ok(findings.every((finding) => finding.severity === 'error'));
  });

  it('should NOT flag a least-privilege workflow', async () => {
    const findings = await rule.check(makeContext(['.github/workflows/safe.yml']));

    assert.strictEqual(findings.length, 0);
  });

  it('should detect workflows when .github is the scan root', async () => {
    const context: ScanContext = {
      rootDir: path.join(fixturesDir, '.github'),
      files: ['workflows/risky.yml'],
    };
    const findings = await rule.check(context);

    assert.strictEqual(findings.length, 4);
  });

  it('should detect pull_request_target in an inline event list', async () => {
    const findings = await rule.check(
      makeContext(['.github/workflows/inline-trigger.yml']),
    );

    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].line, 2);
  });

  it('should ignore workflow-like files outside .github/workflows', async () => {
    const findings = await rule.check(makeContext(['scripts/risky.yml']));

    assert.strictEqual(findings.length, 0);
  });

  it('should have correct rule metadata', () => {
    assert.strictEqual(rule.id, 'OPK-005');
    assert.strictEqual(rule.name, 'Risky CI/CD Workflows');
    assert.strictEqual(rule.category, 'ci-security');
    assert.strictEqual(rule.severity, 'error');
    assert.ok(rule.description.length > 0);
    assert.ok(rule.remediation.length > 0);
  });
});
