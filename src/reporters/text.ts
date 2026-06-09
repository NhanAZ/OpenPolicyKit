import { Severity, ScanResult } from '../types';

function severityIcon(severity: Severity): string {
  switch (severity) {
    case 'error':
      return '\u2716';
    case 'warning':
      return '\u26A0';
    case 'info':
      return '\u2139';
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatText(result: ScanResult): string {
  const lines: string[] = [];

  if (result.findings.length === 0) {
    lines.push(`\u2713 No findings. Scanned ${result.scannedFiles} files in ${formatDuration(result.durationMs)}`);
    return lines.join('\n');
  }

  let maxRuleIdLen = 0;
  let maxMessageLen = 0;

  for (const finding of result.findings) {
    maxRuleIdLen = Math.max(maxRuleIdLen, finding.ruleId.length);
    maxMessageLen = Math.max(maxMessageLen, finding.message.length);
  }

  for (const finding of result.findings) {
    const icon = severityIcon(finding.severity);
    const ruleId = finding.ruleId.padEnd(maxRuleIdLen);
    const message = finding.message.padEnd(maxMessageLen);
    const location = finding.line
      ? `${finding.filePath}:${finding.line}`
      : finding.filePath;

    lines.push(`  ${icon} ${ruleId}  ${message}  ${location}`);
  }

  const duration = formatDuration(result.durationMs);
  const count = result.findings.length;
  const noun = count === 1 ? 'finding' : 'findings';
  lines.push('');
  lines.push(`${count} ${noun} in ${duration}`);

  return lines.join('\n');
}
