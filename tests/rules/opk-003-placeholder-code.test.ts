import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as path from 'path';
import rule from '../../src/rules/opk-003-placeholder-code';
import { ScanContext } from '../../src/types';

const fixturesDir = path.resolve(__dirname, '..', '..', '..', 'tests', 'fixtures', 'placeholder-code');

function makeContext(files: string[]): ScanContext {
  return {
    rootDir: fixturesDir,
    files,
  };
}

describe('OPK-003: Placeholder Implementation', () => {
  it('should detect TODO implement comment', async () => {
    const context = makeContext(['has-todo-implement.ts']);
    const findings = await rule.check(context);

    assert.ok(findings.length > 0, 'Expected at least one finding');
    assert.strictEqual(findings[0].ruleId, 'OPK-003');
    assert.strictEqual(findings[0].severity, 'warning');
    assert.strictEqual(findings[0].filePath, 'has-todo-implement.ts');
    assert.strictEqual(findings[0].line, 2);
    assert.ok(
      findings[0].message.toLowerCase().includes('todo'),
      'Message should mention TODO',
    );
  });

  it('should detect Not implemented error', async () => {
    const context = makeContext(['has-not-implemented.ts']);
    const findings = await rule.check(context);

    assert.ok(findings.length > 0, 'Expected at least one finding');
    assert.strictEqual(findings[0].ruleId, 'OPK-003');
    assert.strictEqual(findings[0].severity, 'warning');
    assert.strictEqual(findings[0].filePath, 'has-not-implemented.ts');
    assert.strictEqual(findings[0].line, 2);
    assert.ok(
      findings[0].message.toLowerCase().includes('not implemented'),
      'Message should mention not implemented',
    );
  });

  it('should NOT flag specific TODO with issue reference and context', async () => {
    const context = makeContext(['has-specific-todo.ts']);
    const findings = await rule.check(context);

    assert.strictEqual(findings.length, 0, 'Expected no findings for specific TODO with context');
  });

  it('should NOT flag clean files without placeholder code', async () => {
    const context = makeContext(['clean-file.ts']);
    const findings = await rule.check(context);

    assert.strictEqual(findings.length, 0, 'Expected no findings for clean file');
  });

  it('should have correct rule metadata', () => {
    assert.strictEqual(rule.id, 'OPK-003');
    assert.strictEqual(rule.name, 'Placeholder Implementation');
    assert.strictEqual(rule.severity, 'warning');
    assert.ok(rule.description.length > 0, 'Description should not be empty');
    assert.ok(rule.remediation.length > 0, 'Remediation should not be empty');
  });
});
