import { ScanResult } from '../types';

export function formatJson(result: ScanResult): string {
  const errors = result.findings.filter((f) => f.severity === 'error').length;
  const warnings = result.findings.filter((f) => f.severity === 'warning').length;
  const infos = result.findings.filter((f) => f.severity === 'info').length;

  const output = {
    findings: result.findings,
    summary: {
      total: result.findings.length,
      errors,
      warnings,
      infos,
      scannedFiles: result.scannedFiles,
      rulesRun: result.rulesRun,
      durationMs: result.durationMs,
    },
  };

  return JSON.stringify(output, null, 2);
}
