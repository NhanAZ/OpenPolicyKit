import { after, describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import rule from '../../src/rules/opk-007-large-generated-files';
import { ScanContext } from '../../src/types';

const fixturesDir = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'tests',
  'fixtures',
  'large-generated-files',
);
const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opk-007-'));

after(() => {
  fs.rmSync(temporaryDir, { recursive: true, force: true });
});

function writeExpandedFixture(sourceName: string, targetName: string): void {
  const source = fs.readFileSync(path.join(fixturesDir, sourceName), 'utf-8');
  const repeatCount = Math.ceil(1_000_001 / Buffer.byteLength(source));
  fs.writeFileSync(path.join(temporaryDir, targetName), source.repeat(repeatCount));
}

function makeContext(files: string[]): ScanContext {
  return {
    rootDir: temporaryDir,
    files,
  };
}

describe('OPK-007: Large Generated Files', () => {
  it('should detect a large file with a generated marker', async () => {
    writeExpandedFixture('generated-header.ts', 'client.ts');
    const findings = await rule.check(makeContext(['client.ts']));

    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].ruleId, 'OPK-007');
    assert.strictEqual(findings[0].severity, 'warning');
    assert.ok(findings[0].message.includes('KiB'));
  });

  it('should detect a large file with a generated filename', async () => {
    writeExpandedFixture('regular-source.js', 'vendor.min.js');
    const findings = await rule.check(makeContext(['vendor.min.js']));

    assert.strictEqual(findings.length, 1);
  });

  it('should NOT flag a large file without generated indicators', async () => {
    writeExpandedFixture('regular-source.js', 'application.js');
    const findings = await rule.check(makeContext(['application.js']));

    assert.strictEqual(findings.length, 0);
  });

  it('should NOT flag a small generated file', async () => {
    fs.copyFileSync(
      path.join(fixturesDir, 'generated-header.ts'),
      path.join(temporaryDir, 'small.generated.ts'),
    );
    const findings = await rule.check(makeContext(['small.generated.ts']));

    assert.strictEqual(findings.length, 0);
  });

  it('should ignore missing files without failing', async () => {
    const findings = await rule.check(makeContext(['missing.generated.ts']));

    assert.strictEqual(findings.length, 0);
  });

  it('should have correct rule metadata', () => {
    assert.strictEqual(rule.id, 'OPK-007');
    assert.strictEqual(rule.name, 'Large Generated Files');
    assert.strictEqual(rule.category, 'code-quality');
    assert.strictEqual(rule.severity, 'warning');
    assert.ok(rule.description.length > 0);
    assert.ok(rule.remediation.length > 0);
  });
});
