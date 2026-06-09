import test from 'node:test';
import assert from 'node:assert/strict';
import { formatJson } from '../../src/reporters/json';
import { formatText } from '../../src/reporters/text';
import { RuleFinding, ScanResult } from '../../src/types';

interface JsonOutput {
  findings: RuleFinding[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    infos: number;
    scannedFiles: number;
    rulesRun: number;
    durationMs: number;
  };
}

const warningFinding: RuleFinding = {
  ruleId: 'OPK-002',
  ruleName: 'prompt-artifacts',
  severity: 'warning',
  message: 'Prompt artifact found',
  filePath: 'src/a.ts',
  line: 9,
  category: 'quality',
  remediation: 'Remove prompt artifacts from committed source files.',
};

const errorFinding: RuleFinding = {
  ruleId: 'OPK-003',
  ruleName: 'placeholder-code',
  severity: 'error',
  message: 'Placeholder remains',
  filePath: 'src/b.ts',
  category: 'quality',
  remediation: 'Replace placeholder code with a real implementation.',
};

const infoFinding: RuleFinding = {
  ruleId: 'OPK-007',
  ruleName: 'large-generated-files',
  severity: 'info',
  message: 'Large generated file',
  filePath: 'src/generated.ts',
  line: 1,
  category: 'maintainability',
  remediation: 'Keep generated files out of source control unless required.',
};

function createResult(
  findings: RuleFinding[],
  overrides: Partial<Omit<ScanResult, 'findings'>> = {},
): ScanResult {
  return {
    findings,
    scannedFiles: 10,
    rulesRun: 7,
    durationMs: 1200,
    ...overrides,
  };
}

function withNoColor(runAssertion: () => void): void {
  const previousNoColor = process.env.NO_COLOR;
  process.env.NO_COLOR = '1';

  try {
    runAssertion();
  } finally {
    if (previousNoColor === undefined) {
      delete process.env.NO_COLOR;
      return;
    }

    process.env.NO_COLOR = previousNoColor;
  }
}

test('reporter output', async (t) => {
  await t.test('should format JSON with stable findings and summary counts', () => {
    const result = createResult([warningFinding, errorFinding, infoFinding], {
      scannedFiles: 42,
      durationMs: 800,
    });

    const parsed = JSON.parse(formatJson(result)) as JsonOutput;

    assert.deepStrictEqual(parsed.findings, result.findings);
    assert.deepStrictEqual(parsed.summary, {
      total: 3,
      errors: 1,
      warnings: 1,
      infos: 1,
      scannedFiles: 42,
      rulesRun: 7,
      durationMs: 800,
    });
  });

  await t.test('should format text output for a clean scan', () => {
    withNoColor(() => {
      const output = formatText(createResult([], { scannedFiles: 3, durationMs: 850 }));

      assert.strictEqual(output, '\u2713 No findings. Scanned 3 files in 850ms');
      assert.doesNotMatch(output, /\x1b\[/);
    });
  });

  await t.test('should group text findings by sorted file path with summary counts', () => {
    withNoColor(() => {
      const output = formatText(createResult([errorFinding, warningFinding, infoFinding]));

      assert.ok(output.indexOf('src/a.ts') < output.indexOf('src/b.ts'));
      assert.ok(output.indexOf('src/b.ts') < output.indexOf('src/generated.ts'));
      assert.match(output, /src\/a\.ts\n\s+9\s+warning\s+Prompt artifact found\s+OPK-002/);
      assert.match(output, /src\/b\.ts\n\s+error\s+Placeholder remains\s+OPK-003/);
      assert.match(output, /src\/generated\.ts\n\s+1\s+info\s+Large generated file\s+OPK-007/);
      assert.match(output, /\u2716 1 error, 1 warning, 1 info in 1\.2s$/);
      assert.doesNotMatch(output, /\x1b\[/);
    });
  });

  await t.test('should pluralize text summary counts', () => {
    withNoColor(() => {
      const secondWarning = {
        ...warningFinding,
        filePath: 'src/c.ts',
        line: 10,
      };
      const output = formatText(createResult([warningFinding, secondWarning]));

      assert.match(output, /\u2716 2 warnings in 1\.2s$/);
    });
  });
});
