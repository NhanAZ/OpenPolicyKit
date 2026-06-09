import * as fs from 'fs';
import * as path from 'path';
import { Rule, RuleFinding, ScanContext } from '../types';

const MAX_FILE_SIZE = 1_000_000;
const WORKFLOW_PATH = /(?:^|\/)\.github\/workflows\/[^/]+\.(?:yml|yaml)$/i;

interface RiskPattern {
  regex: RegExp;
  message: string;
}

const RISK_PATTERNS: RiskPattern[] = [
  {
    regex: /^\s*(?:pull_request_target\s*:|on\s*:\s*(?:pull_request_target|\[[^\]]*\bpull_request_target\b))/,
    message: 'Workflow uses pull_request_target, which runs with base repository privileges',
  },
  {
    regex: /^\s*permissions\s*:\s*write-all\s*(?:#.*)?$/i,
    message: 'Workflow grants write-all permissions',
  },
  {
    regex: /\buses:\s*["']?[^@\s"'#]+@(?:main|master|latest|HEAD)\b/i,
    message: 'Workflow action uses a branch or floating ref',
  },
  {
    regex: /\b(?:curl|wget)\b[^|]*\|\s*(?:sudo\s+)?(?:bash|sh)\b/i,
    message: 'Workflow pipes a remote download directly into a shell',
  },
];

function isWorkflowFile(absolutePath: string): boolean {
  return WORKFLOW_PATH.test(absolutePath.split(path.sep).join('/'));
}

function readWorkflow(absolutePath: string): string | undefined {
  try {
    const stat = fs.statSync(absolutePath);
    if (stat.size === 0 || stat.size > MAX_FILE_SIZE) {
      return undefined;
    }

    return fs.readFileSync(absolutePath, 'utf-8');
  } catch {
    return undefined;
  }
}

function createFinding(
  relativePath: string,
  line: number,
  message: string,
): RuleFinding {
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    severity: rule.severity,
    message,
    filePath: relativePath,
    line,
    category: rule.category,
    remediation: rule.remediation,
  };
}

function checkWorkflow(content: string, relativePath: string): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const lines = content.split('\n');

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    if (lines[lineIndex].trimStart().startsWith('#')) {
      continue;
    }

    for (const pattern of RISK_PATTERNS) {
      if (pattern.regex.test(lines[lineIndex])) {
        findings.push(createFinding(relativePath, lineIndex + 1, pattern.message));
      }
    }
  }

  return findings;
}

const rule: Rule = {
  id: 'OPK-005',
  name: 'Risky CI/CD Workflows',
  category: 'ci-security',
  severity: 'error',
  description: 'Detects high-risk patterns in GitHub Actions workflow files.',
  remediation: 'Use least-privilege permissions, stable action versions, and trusted build steps.',

  async check(context: ScanContext): Promise<RuleFinding[]> {
    const findings: RuleFinding[] = [];

    for (const relativePath of context.files) {
      const absolutePath = path.join(context.rootDir, relativePath);
      if (!isWorkflowFile(absolutePath)) {
        continue;
      }

      const content = readWorkflow(absolutePath);
      if (content) {
        findings.push(...checkWorkflow(content, relativePath));
      }
    }

    return findings;
  },
};

export default rule;
