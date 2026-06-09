import * as fs from 'fs';
import * as path from 'path';
import { Rule, RuleFinding, ScanContext } from '../types';

const MIN_FILE_SIZE_BYTES = 1_000_000;
const HEADER_SIZE_BYTES = 16_384;
const GENERATED_NAME_PATTERN =
  /(?:^|[.-])generated(?:[.-]|$)|\.min\.(?:js|css)$|\.(?:js|css|mjs|cjs)\.map$/i;
const GENERATED_MARKER_PATTERN =
  /@generated\b|auto[- ]generated|generated file|this file (?:is|was) generated|code generated[^\r\n]{0,80}do not edit/i;

function getLargeFileSize(absolutePath: string): number | undefined {
  try {
    const stat = fs.statSync(absolutePath);
    return stat.isFile() && stat.size >= MIN_FILE_SIZE_BYTES
      ? stat.size
      : undefined;
  } catch {
    return undefined;
  }
}

function readFileHeader(absolutePath: string): string | undefined {
  let fileDescriptor: number | undefined;

  try {
    fileDescriptor = fs.openSync(absolutePath, 'r');
    const buffer = Buffer.alloc(HEADER_SIZE_BYTES);
    const bytesRead = fs.readSync(fileDescriptor, buffer, 0, buffer.length, 0);
    return buffer.toString('utf-8', 0, bytesRead);
  } catch {
    return undefined;
  } finally {
    if (fileDescriptor !== undefined) {
      fs.closeSync(fileDescriptor);
    }
  }
}

function appearsGenerated(relativePath: string, absolutePath: string): boolean {
  if (GENERATED_NAME_PATTERN.test(path.basename(relativePath))) {
    return true;
  }

  const header = readFileHeader(absolutePath);
  return header !== undefined && GENERATED_MARKER_PATTERN.test(header);
}

function createFinding(relativePath: string, sizeBytes: number): RuleFinding {
  const sizeKiB = Math.ceil(sizeBytes / 1024);

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    severity: rule.severity,
    message: `Large generated file is ${sizeKiB} KiB and should be reviewed before commit`,
    filePath: relativePath,
    category: rule.category,
    remediation: rule.remediation,
  };
}

const rule: Rule = {
  id: 'OPK-007',
  name: 'Large Generated Files',
  category: 'code-quality',
  severity: 'warning',
  description: 'Detects files at least 1 MB that appear to be generated.',
  remediation: 'Remove generated artifacts or document why they must be versioned and how to reproduce them.',

  async check(context: ScanContext): Promise<RuleFinding[]> {
    const findings: RuleFinding[] = [];

    for (const relativePath of context.files) {
      const absolutePath = path.join(context.rootDir, relativePath);
      const sizeBytes = getLargeFileSize(absolutePath);

      if (sizeBytes !== undefined && appearsGenerated(relativePath, absolutePath)) {
        findings.push(createFinding(relativePath, sizeBytes));
      }
    }

    return findings;
  },
};

export default rule;
