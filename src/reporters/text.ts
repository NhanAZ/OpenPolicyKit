import { Severity, ScanResult, RuleFinding } from '../types';

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function colorize(text: string, color: string): string {
  if (process.env.NO_COLOR || process.env.TERM === 'dumb') {
    return text;
  }
  return `${color}${text}${colors.reset}`;
}

function severityFormat(severity: Severity): string {
  switch (severity) {
    case 'error':
      return colorize('error', colors.red);
    case 'warning':
      return colorize('warning', colors.yellow);
    case 'info':
      return colorize('info', colors.blue);
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatCount(count: number, singular: string): string {
  const noun = count === 1 ? singular : `${singular}s`;
  return `${count} ${noun}`;
}

export function formatText(result: ScanResult): string {
  const lines: string[] = [];

  if (result.findings.length === 0) {
    lines.push(colorize(`\u2713 No findings. Scanned ${result.scannedFiles} files in ${formatDuration(result.durationMs)}`, colors.cyan));
    return lines.join('\n');
  }

  const byFile: Record<string, RuleFinding[]> = {};
  for (const finding of result.findings) {
    if (!byFile[finding.filePath]) {
      byFile[finding.filePath] = [];
    }
    byFile[finding.filePath].push(finding);
  }

  const files = Object.keys(byFile).sort();

  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const file of files) {
    lines.push('');
    lines.push(colorize(file, colors.cyan + colors.bold));

    const fileFindings = byFile[file];

    // Calculate max lengths for padding
    let maxLineLen = 0;
    let maxSevLen = 0;

    for (const finding of fileFindings) {
      if (finding.severity === 'error') errorCount++;
      if (finding.severity === 'warning') warningCount++;
      if (finding.severity === 'info') infoCount++;

      const lineStr = finding.line ? String(finding.line) : '-';
      maxLineLen = Math.max(maxLineLen, lineStr.length);
      maxSevLen = Math.max(maxSevLen, finding.severity.length);
    }

    for (const finding of fileFindings) {
      const lineStr = finding.line ? String(finding.line) : '';
      const paddedLine = lineStr.padStart(maxLineLen);

      const sev = severityFormat(finding.severity);
      const paddedSev = sev + ' '.repeat(Math.max(0, maxSevLen - finding.severity.length));

      const ruleId = colorize(finding.ruleId, colors.gray);

      lines.push(`  ${paddedLine}  ${paddedSev}  ${finding.message}  ${ruleId}`);
    }
  }

  const duration = formatDuration(result.durationMs);
  lines.push('');

  const summaryParts: string[] = [];
  if (errorCount > 0) {
    summaryParts.push(colorize(formatCount(errorCount, 'error'), colors.red + colors.bold));
  }
  if (warningCount > 0) {
    summaryParts.push(colorize(formatCount(warningCount, 'warning'), colors.yellow + colors.bold));
  }
  if (infoCount > 0) {
    summaryParts.push(colorize(formatCount(infoCount, 'info'), colors.blue + colors.bold));
  }

  lines.push(`\u2716 ${summaryParts.join(', ')} in ${duration}`);

  return lines.join('\n');
}
