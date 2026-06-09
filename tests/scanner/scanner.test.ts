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
});
