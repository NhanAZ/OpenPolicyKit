import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as path from 'path';
import rule from '../../src/rules/opk-002-prompt-artifacts';
import { ScanContext } from '../../src/types';

const fixturesDir = path.resolve(__dirname, '..', '..', '..', 'tests', 'fixtures', 'prompt-artifacts');

function makeContext(files: string[]): ScanContext {
  return {
    rootDir: fixturesDir,
    files,
  };
}

describe('OPK-002: AI Prompt Artifacts', () => {
  it('should detect AI assistant comment in TypeScript file', async () => {
    const context = makeContext(['has-ai-comment.ts']);
    const findings = await rule.check(context);

    assert.ok(findings.length > 0, 'Expected at least one finding');
    assert.strictEqual(findings[0].ruleId, 'OPK-002');
    assert.strictEqual(findings[0].severity, 'warning');
    assert.strictEqual(findings[0].filePath, 'has-ai-comment.ts');
    assert.strictEqual(findings[0].line, 1);
    assert.ok(
      findings[0].message.toLowerCase().includes('ai'),
      'Message should reference AI prompt artifact',
    );
  });

  it('should detect generated-by note in Python file', async () => {
    const context = makeContext(['has-generated-note.py']);
    const findings = await rule.check(context);

    assert.ok(findings.length > 0, 'Expected at least one finding');
    assert.strictEqual(findings[0].ruleId, 'OPK-002');
    assert.strictEqual(findings[0].severity, 'warning');
    assert.strictEqual(findings[0].filePath, 'has-generated-note.py');
    assert.strictEqual(findings[0].line, 1);
  });

  it('should NOT flag clean files without prompt artifacts', async () => {
    const context = makeContext(['clean-file.ts']);
    const findings = await rule.check(context);

    assert.strictEqual(findings.length, 0, 'Expected no findings for clean file');
  });

  it('should have correct rule metadata', () => {
    assert.strictEqual(rule.id, 'OPK-002');
    assert.strictEqual(rule.name, 'AI Prompt Artifacts');
    assert.strictEqual(rule.severity, 'warning');
    assert.ok(rule.description.length > 0, 'Description should not be empty');
    assert.ok(rule.remediation.length > 0, 'Remediation should not be empty');
  });
});
