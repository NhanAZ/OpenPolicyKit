import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as path from 'path';
import rule from '../../src/rules/opk-004-dependency-versions';
import { ScanContext } from '../../src/types';

const fixturesDir = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'tests',
  'fixtures',
  'dependency-versions',
);

function makeContext(files: string[]): ScanContext {
  return {
    rootDir: fixturesDir,
    files,
  };
}

describe('OPK-004: Unpinned Dependency Versions', () => {
  it('should detect wildcard, range, tag, and partial dependency versions', async () => {
    const context = makeContext(['has-unpinned/package.json']);
    const findings = await rule.check(context);
    const messages = findings.map((finding) => finding.message);

    assert.strictEqual(findings.length, 4);
    assert.ok(messages.some((message) => message.includes('wildcard-package')));
    assert.ok(messages.some((message) => message.includes('ranged-package')));
    assert.ok(messages.some((message) => message.includes('tagged-package')));
    assert.ok(messages.some((message) => message.includes('partial-package')));
    assert.ok(messages.every((message) => !message.includes('exact-optional-package')));
    assert.ok(findings.every((finding) => finding.ruleId === 'OPK-004'));
    assert.ok(findings.every((finding) => finding.severity === 'warning'));
  });

  it('should NOT flag exact versions or non-registry dependency sources', async () => {
    const context = makeContext(['all-pinned/package.json']);
    const findings = await rule.check(context);

    assert.strictEqual(findings.length, 0);
  });

  it('should ignore invalid package.json files without failing', async () => {
    const context = makeContext(['invalid/package.json']);
    const findings = await rule.check(context);

    assert.strictEqual(findings.length, 0);
  });

  it('should ignore files other than package.json', async () => {
    const context = makeContext(['has-unpinned/not-package.json']);
    const findings = await rule.check(context);

    assert.strictEqual(findings.length, 0);
  });

  it('should have correct rule metadata', () => {
    assert.strictEqual(rule.id, 'OPK-004');
    assert.strictEqual(rule.name, 'Unpinned Dependency Versions');
    assert.strictEqual(rule.category, 'supply-chain');
    assert.strictEqual(rule.severity, 'warning');
    assert.ok(rule.description.length > 0);
    assert.ok(rule.remediation.length > 0);
  });
});
