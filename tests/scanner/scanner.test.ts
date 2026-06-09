import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import { scan } from '../../src/scanner';

const FIXTURES_DIR = path.resolve(__dirname, '..', '..', '..', 'tests', 'fixtures');

test('Scanner Integration', async (t) => {
  await t.test('should skip disabled rules specified in opk.config.json', async () => {
    const rootDir = path.join(FIXTURES_DIR, 'scanner-config');
    const result = await scan(rootDir);

    // OPK-003 is disabled in opk.config.json, so the TODO implement should not be flagged.
    // There are no other findings in this folder.
    assert.strictEqual(result.findings.length, 0);
  });

  await t.test('should filter findings by minimum severity', async () => {
    // We scan prompt-artifacts which contains OPK-002 (warning).
    const rootDir = path.join(FIXTURES_DIR, 'prompt-artifacts');
    
    // Default (info) should include warnings
    const defaultResult = await scan(rootDir);
    assert.ok(defaultResult.findings.length > 0);
    assert.strictEqual(defaultResult.findings[0].severity, 'warning');

    // Error minSeverity should filter out warnings
    const errorResult = await scan(rootDir, 'error');
    assert.strictEqual(errorResult.findings.length, 0);
  });
});
