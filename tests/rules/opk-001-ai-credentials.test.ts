import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as path from 'path';
import rule from '../../src/rules/opk-001-ai-credentials';
import { ScanContext } from '../../src/types';

const fixturesDir = path.resolve(__dirname, '..', '..', '..', 'tests', 'fixtures', 'ai-credentials');

function makeContext(files: string[]): ScanContext {
  return {
    rootDir: fixturesDir,
    files,
  };
}

describe('OPK-001: Hardcoded AI Credentials', () => {
  it('should detect a hardcoded OpenAI API key', async () => {
    const context = makeContext(['has-openai-key.ts']);
    const findings = await rule.check(context);

    assert.ok(findings.length > 0, 'Expected at least one finding');
    assert.strictEqual(findings[0].ruleId, 'OPK-001');
    assert.strictEqual(findings[0].severity, 'error');
    assert.strictEqual(findings[0].filePath, 'has-openai-key.ts');
    assert.strictEqual(findings[0].line, 1);
    assert.ok(
      findings[0].message.toLowerCase().includes('openai'),
      'Message should mention OpenAI',
    );
    assert.ok(
      !findings[0].message.includes('sk-abc123'),
      'Message must NOT contain the actual key value',
    );
  });

  it('should detect a hardcoded Anthropic API key', async () => {
    const context = makeContext(['has-anthropic-key.ts']);
    const findings = await rule.check(context);

    assert.ok(findings.length > 0, 'Expected at least one finding');
    assert.strictEqual(findings[0].ruleId, 'OPK-001');
    assert.strictEqual(findings[0].severity, 'error');
    assert.strictEqual(findings[0].filePath, 'has-anthropic-key.ts');
    assert.strictEqual(findings[0].line, 1);
    assert.ok(
      findings[0].message.toLowerCase().includes('anthropic'),
      'Message should mention Anthropic',
    );
    assert.ok(
      !findings[0].message.includes('sk-ant-abc123'),
      'Message must NOT contain the actual key value',
    );
  });

  it('should NOT flag environment variable references', async () => {
    const context = makeContext(['has-env-ref.ts']);
    const findings = await rule.check(context);

    assert.strictEqual(findings.length, 0, 'Expected no findings for env var reference');
  });

  it('should NOT flag clean files without credentials', async () => {
    const context = makeContext(['clean-file.ts']);
    const findings = await rule.check(context);

    assert.strictEqual(findings.length, 0, 'Expected no findings for clean file');
  });

  it('should have correct rule metadata', () => {
    assert.strictEqual(rule.id, 'OPK-001');
    assert.strictEqual(rule.name, 'Hardcoded AI Credentials');
    assert.strictEqual(rule.severity, 'error');
    assert.ok(rule.description.length > 0, 'Description should not be empty');
    assert.ok(rule.remediation.length > 0, 'Remediation should not be empty');
  });
});
